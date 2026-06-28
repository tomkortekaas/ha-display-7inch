import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { Resvg } from '@resvg/resvg-js'
import { NextRequest, NextResponse } from 'next/server'
import satori from 'satori'

import { AhClient, fetchRecipeDetail, wrapRecipeStep } from '@/lib/ah'
import { cacheRecipeDetail, getCachedRecipeDetail } from '@/lib/ah-cache'

export const dynamic = 'force-dynamic'

const client = new AhClient({
  initialRefreshToken: process.env.AH_REFRESH_TOKEN ?? '',
  tokenFile:
    process.env.AH_TOKEN_PATH ??
    join(process.env.DATA_DIR ?? '/tmp', 'ah-token.json'),
})

let fontPromise: Promise<Buffer> | undefined

function getFont() {
  fontPromise ??= readFile(
    join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf'),
  )
  return fontPromise
}

function escapeXml(message: string) {
  return message
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function errorPng(message: string, width = 1024, height = 600) {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#0D0D1A"/>
    <text x="${width / 2}" y="${height / 2 - 16}" font-family="sans-serif" font-size="22" fill="#FF6680" text-anchor="middle">Recept laden mislukt</text>
    <text x="${width / 2}" y="${height / 2 + 24}" font-family="sans-serif" font-size="15" fill="#A0A0A0" text-anchor="middle">${escapeXml(message)}</text>
  </svg>`
  return new Resvg(svg).render().asPng()
}

function textBlock(
  children: unknown,
  style: Record<string, unknown> = {},
) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        ...style,
      },
      children,
    },
  }
}

function recipeHeader(recipe: Awaited<ReturnType<typeof fetchRecipeDetail>>) {
  return textBlock(
    [
      {
        type: 'div',
        props: {
          style: {
            width: 820,
            fontSize: 31,
            fontWeight: 700,
            color: '#FF9020',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
          children: recipe.title,
        },
      },
      {
        type: 'div',
        props: {
          style: { marginTop: 8, fontSize: 17, color: '#A0A0AA' },
          children: `${recipe.duration} min  ·  ${recipe.servings} personen`,
        },
      },
    ],
    {
      width: 1024,
      height: 116,
      padding: '24px 36px',
      background: '#111120',
      borderBottom: '1px solid #29293D',
      color: '#E8E8EC',
      fontFamily: 'Roboto',
    },
  )
}

function ingredientsPanel(recipe: Awaited<ReturnType<typeof fetchRecipeDetail>>) {
  return textBlock(
    [
      {
        type: 'div',
        props: {
          style: {
            marginBottom: 18,
            fontSize: 13,
            letterSpacing: 2,
            color: '#9292A0',
          },
          children: 'INGREDIENTEN',
        },
      },
      ...recipe.ingredients.map((ingredient) => ({
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'row',
            marginBottom: 12,
            fontSize: 17,
            lineHeight: 1.38,
            color: '#F1F1F4',
          },
          children: [
            {
              type: 'span',
              props: {
                style: { marginRight: 10, color: '#FF9020' },
                children: '-',
              },
            },
            { type: 'span', props: { children: ingredient } },
          ],
        },
      })),
    ],
    {
      width: 360,
      height: 1600,
      padding: '24px 24px',
      background: '#0D0D1A',
      color: '#E8E8EC',
      fontFamily: 'Roboto',
    },
  )
}

function stepsPanel(recipe: Awaited<ReturnType<typeof fetchRecipeDetail>>) {
  return textBlock(
    [
      {
        type: 'div',
        props: {
          style: {
            marginBottom: 18,
            fontSize: 13,
            letterSpacing: 2,
            color: '#9292A0',
          },
          children: 'BEREIDING',
        },
      },
      ...recipe.steps.map((text, index) => ({
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: 20,
            paddingBottom: 20,
            borderBottom: '1px solid #29293D',
          },
          children: [
            {
              type: 'div',
              props: {
                style: {
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  marginRight: 16,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#FF902022',
                  color: '#FF9020',
                  fontSize: 17,
                  fontWeight: 700,
                },
                children: String(index + 1),
              },
            },
            {
              type: 'div',
              props: {
                style: {
                  flex: 1,
                  fontSize: 20,
                  lineHeight: 1.48,
                  color: '#F1F1F4',
                },
                children: text,
              },
            },
          ],
        },
      })),
    ],
    {
      width: 664,
      height: 2200,
      padding: '24px 30px',
      background: '#0D0D1A',
      color: '#E8E8EC',
      fontFamily: 'Roboto',
    },
  )
}

function allPanel(recipe: Awaited<ReturnType<typeof fetchRecipeDetail>>) {
  return textBlock(
    [
      recipeHeader(recipe),
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'row',
            width: 1024,
            height: 1684,
          },
          children: [ingredientsPanel(recipe), stepsPanel(recipe)],
        },
      },
    ],
    {
      width: 1024,
      height: 1800,
      background: '#0D0D1A',
      color: '#E8E8EC',
      fontFamily: 'Roboto',
    },
  )
}

function stepPanel(
  recipe: Awaited<ReturnType<typeof fetchRecipeDetail>>,
  requestedStep: number,
) {
  const step = wrapRecipeStep(requestedStep, Math.max(1, recipe.steps.length))
  const stepText = recipe.steps[step] ?? 'Geen bereidingsstappen gevonden.'

  return textBlock(
    [
      recipeHeader(recipe),
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'row',
            width: 1024,
            height: 408,
          },
          children: [
            {
              ...ingredientsPanel({
                ...recipe,
                ingredients: recipe.ingredients.slice(0, 12),
              }),
              props: {
                ...ingredientsPanel({
                  ...recipe,
                  ingredients: recipe.ingredients.slice(0, 12),
                }).props,
                style: {
                  ...ingredientsPanel(recipe).props.style,
                  height: 408,
                },
              },
            },
            textBlock(
              [
                {
                  type: 'div',
                  props: {
                    style: {
                      marginBottom: 14,
                      fontSize: 14,
                      color: '#FF9020',
                    },
                    children: `STAP ${step + 1} VAN ${Math.max(1, recipe.steps.length)}`,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: 22,
                      lineHeight: 1.55,
                      color: '#F1F1F4',
                    },
                    children: stepText,
                  },
                },
              ],
              {
                width: 664,
                height: 408,
                padding: '28px 32px',
                background: '#171727',
                borderLeft: '4px solid #FF9020',
              },
            ),
          ],
        },
      },
      {
        type: 'div',
        props: {
          style: {
            width: 1024,
            height: 76,
            background: '#090912',
            borderTop: '1px solid #202033',
          },
        },
      },
    ],
    {
      width: 1024,
      height: 600,
      background: '#0D0D1A',
      color: '#E8E8EC',
      fontFamily: 'Roboto',
    },
  )
}

async function renderPng(
  element: unknown,
  width: number,
  height: number,
  font: Buffer,
) {
  const svg = await satori(element as any, {
    width,
    height,
    fonts: [
      {
        name: 'Roboto',
        data: font,
        weight: 400,
        style: 'normal',
      },
    ],
  })
  return new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
  })
    .render()
    .asPng()
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  let width = 1024
  let height = 600

  try {
    const { id } = await context.params
    const recipeId = Number.parseInt(id, 10)
    if (!Number.isFinite(recipeId)) {
      throw new Error('Ongeldig receptnummer')
    }

    const mode = request.nextUrl.searchParams.get('mode') ?? 'step'
    const refresh = request.nextUrl.searchParams.get('refresh') === '1'
    const cachedRecipe = getCachedRecipeDetail(String(recipeId))
    let recipe = refresh ? null : cachedRecipe

    if (!recipe) {
      try {
        recipe = await fetchRecipeDetail(client, recipeId)
        cacheRecipeDetail(recipe)
      } catch (error) {
        if (!cachedRecipe) throw error
        recipe = cachedRecipe
      }
    }

    const requestedStep = Number.parseInt(
      request.nextUrl.searchParams.get('step') ?? '0',
      10,
    )
    const font = await getFont()

    let element: unknown
    if (mode === 'header') {
      width = 1024
      height = 116
      element = recipeHeader(recipe)
    } else if (mode === 'ingredients') {
      width = 360
      height = 1600
      element = ingredientsPanel(recipe)
    } else if (mode === 'steps') {
      width = 664
      height = 2200
      element = stepsPanel(recipe)
    } else if (mode === 'all') {
      width = 1024
      height = 1800
      element = allPanel(recipe)
    } else {
      width = 1024
      height = 600
      element = stepPanel(recipe, requestedStep)
    }

    const png = await renderPng(element, width, height, font)

    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
        'X-Total-Steps': String(recipe.steps.length),
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Onbekende AH-fout'
    console.error('[ah/recipe/image]', message)
    return new NextResponse(new Uint8Array(errorPng(message, width, height)), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    })
  }
}
