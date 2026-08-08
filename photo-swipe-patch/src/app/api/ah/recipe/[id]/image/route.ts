import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { Resvg } from '@resvg/resvg-js'
import { NextRequest, NextResponse } from 'next/server'
import satori from 'satori'

import { AhClient, fetchRecipeDetail, wrapRecipeStep } from '@/lib/ah'
import { cacheRecipeDetail, getCachedRecipeDetail } from '@/lib/ah-cache'

function dimensionsForMode(mode: string): { width: number; height: number } {
  switch (mode) {
    case 'header':
      return { width: 1024, height: 116 }
    case 'ingredients':
      return { width: 360, height: 1600 }
    case 'steps':
      return { width: 664, height: 2200 }
    case 'all':
      return { width: 1024, height: 1800 }
    default:
      return { width: 1024, height: 600 }
  }
}

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

function errorElement(message: string, width: number, height: number) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width,
        height,
        background: '#0D0D1A',
        fontFamily: 'Roboto',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { fontSize: 22, color: '#FF6680' },
            children: 'Recept laden mislukt',
          },
        },
        {
          type: 'div',
          props: {
            style: { marginTop: 12, fontSize: 15, color: '#A0A0A0' },
            children: message,
          },
        },
      ],
    },
  }
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
  const mode = request.nextUrl.searchParams.get('mode') ?? 'step'
  const { width, height } = dimensionsForMode(mode)

  try {
    const { id } = await context.params
    const recipeId = Number.parseInt(id, 10)
    if (!Number.isFinite(recipeId)) {
      throw new Error('Ongeldig receptnummer')
    }

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
      element = recipeHeader(recipe)
    } else if (mode === 'ingredients') {
      element = ingredientsPanel(recipe)
    } else if (mode === 'steps') {
      element = stepsPanel(recipe)
    } else if (mode === 'all') {
      element = allPanel(recipe)
    } else {
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
    const font = await getFont()
    const png = await renderPng(
      errorElement(message, width, height),
      width,
      height,
      font,
    )
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    })
  }
}
