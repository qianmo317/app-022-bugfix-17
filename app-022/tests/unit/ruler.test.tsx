import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Ruler, PageView } from '../../src/components/PageView';
import { defaultLayout } from '../../src/lib/layout';
import type { Worksheet } from '../../src/types';

function makeWorksheet(chars: string[]): Worksheet {
  return { id: 'test', title: '测试', chars, layout: defaultLayout, pages: 1, updatedAt: 0 };
}

describe('Ruler 100mm 校验尺', () => {
  const svg = renderToStaticMarkup(createElement(Ruler));

  it('宽高带 mm 单位（无单位会被当成 px，实际只剩约 26.5mm）', () => {
    expect(svg).toContain('width="100mm"');
    expect(svg).toContain('height="7mm"');
  });

  it('每 1mm 一条刻度，共 101 条', () => {
    const ticks = svg.match(/<line/g) ?? [];
    expect(ticks).toHaveLength(101);
  });

  it('11 个数字（0..100），且数字在其对应毫米位置', () => {
    for (const mm of [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
      expect(svg).toContain(`>${mm}</text>`);
    }
    // 端点数字贴边框锚定，避免 middle 锚点被边框裁掉而错位
    expect(svg).toContain('text-anchor="start"');
    expect(svg).toContain('text-anchor="end"');
  });
});

describe('PageView 校验尺与打印提示', () => {
  it('多页文档只在第 1 页渲染 1 把尺子', () => {
    // 无笔顺数据时每字 5 格（例字 + 4 空格），每行 10 格、每页 10 行 → 每页 20 字
    const html = renderToStaticMarkup(createElement(PageView, { worksheet: makeWorksheet('天地玄黄宇宙洪荒日月盈昃辰宿列张寒来暑往秋收冬藏闰余成岁律吕调阳云腾致雨'.split('')), plain: true }));
    expect((html.match(/data-testid="ruler"/g) ?? []).length).toBe(1);
  });

  it('尺子下方带随纸打印的「关闭缩放」提示（不在 no-print 工具栏里）', () => {
    const html = renderToStaticMarkup(createElement(PageView, { worksheet: makeWorksheet(['春']), plain: true }));
    expect(html).toContain('ruler-note');
    expect(html).toContain('实际大小');
  });
});
