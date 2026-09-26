import { memo } from 'react';
import type { JSX, MouseEvent } from 'react';
import type { Row, Worksheet } from '../types';
import { PAGE, clampLayout, paginate } from '../lib/layout';
import { RowContent, ROW_FACTOR } from './paint';
import { getStrokes } from '../lib/data';
import { readingsOf } from '../lib/pinyin';

/** 100mm 校验尺（1:1 打印校验）。SVG 宽高必须带 mm 单位，否则会被当成 px。 */
export function Ruler(): JSX.Element {
  return (
    <svg
      data-testid="ruler"
      width="100mm"
      height="7mm"
      viewBox="0 0 100 7"
      style={{ display: 'block' }}
      aria-label="100mm 校验尺"
    >
      <rect x={0.15} y={0.15} width={99.7} height={6.7} fill="#fff" stroke="#999" strokeWidth={0.3} />
      {/* 每 1mm 一条刻度：10mm 长、5mm 中、其余短 */}
      {Array.from({ length: 101 }, (_, i) => {
        const len = i % 10 === 0 ? 2 : i % 5 === 0 ? 1.3 : 0.7;
        return (
          <line
            key={i}
            x1={i}
            y1={6.85}
            x2={i}
            y2={6.85 - len}
            stroke="#333"
            strokeWidth={i % 10 === 0 ? 0.25 : 0.2}
          />
        );
      })}
      {Array.from({ length: 11 }, (_, i) => {
        const mm = i * 10;
        const x = i === 0 ? 0.8 : i === 10 ? 99.2 : mm;
        return (
          <text
            key={mm}
            x={x}
            y={2.7}
            textAnchor={i === 0 ? 'start' : i === 10 ? 'end' : 'middle'}
            fontSize={2.6}
            fontFamily="'Noto Sans SC','PingFang SC',sans-serif"
            fill="#333"
          >
            {mm}
          </text>
        );
      })}
    </svg>
  );
}

export function pinyinResolver(worksheet: Worksheet): (ch: string) => string | undefined {
  return (ch: string) => {
    const readings = readingsOf(ch);
    if (readings.length === 0) return undefined;
    const idx = worksheet.pinyinChoice?.[ch] ?? 0;
    return readings[Math.min(idx, readings.length - 1)];
  };
}

function strokeCountOf(ch: string): number | undefined {
  const s = getStrokes(ch);
  return s ? s.length : undefined;
}

/** 计算行内各字块的 unit 区间，用于点击命中 */
function blockRanges(row: Row): { char: string; start: number; end: number }[] {
  let x = 0;
  return row.map((b) => {
    const r = { char: b.char, start: x, end: x + b.cells.length * 100 };
    x = r.end;
    return r;
  });
}

type PageViewProps = {
  worksheet: Worksheet;
  selectedChar?: string;
  onSelectChar?: (ch: string) => void;
  /** 打印/导出模式下不显示选中态与点击行为 */
  plain?: boolean;
  className?: string;
};

/** 全部页面（预览与打印共用同一渲染，所见即打印所得） */
export const PageView = memo(function PageView({
  worksheet,
  selectedChar,
  onSelectChar,
  plain,
  className,
}: PageViewProps) {
  const layout = clampLayout(worksheet.layout);
  const pages = paginate(worksheet.chars, layout, strokeCountOf);
  const pinyinFor = pinyinResolver(worksheet);
  const rowWidthMm = layout.perLine * layout.cellMm;
  const rowHeightMm = layout.cellMm * ROW_FACTOR;

  function handleRowClick(row: Row, e: MouseEvent<SVGSVGElement>) {
    if (plain || !onSelectChar) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const unit = ((e.clientX - rect.left) / rect.width) * layout.perLine * 100;
    const hit = blockRanges(row).find((r) => unit >= r.start && unit < r.end);
    if (hit) onSelectChar(hit.char);
  }

  return (
    <div className={className} data-pages data-page-count={pages.length}>
      {pages.map((rows, pi) => (
        <div
          key={pi}
          className="sheet"
          data-page={pi}
          style={{
            width: `${PAGE.wMm}mm`,
            height: `${PAGE.hMm}mm`,
            paddingTop: `${PAGE.marginTMm}mm`,
            paddingRight: `${PAGE.marginRMm}mm`,
            paddingBottom: `${PAGE.marginBMm}mm`,
            paddingLeft: `${PAGE.marginLMm}mm`,
          }}
        >
          <div className="sheet-header" style={{ height: `${PAGE.headerMm}mm` }}>
            <div className="sheet-title" data-testid="sheet-title">
              {worksheet.title}
            </div>
            {pi === 0 && (
              <div className="ruler-row">
                <Ruler />
                <span className="ruler-note">打印时请在打印设置中选择「实际大小」，关闭「缩放 / 适应页面」，此尺应为 100mm。</span>
              </div>
            )}
          </div>
          <div
            className="sheet-rows"
            style={{ display: 'flex', flexDirection: 'column', gap: `${layout.lineGapMm}mm` }}
          >
            {rows.map((row, ri) => (
              <svg
                key={ri}
                className="row-svg"
                data-row={ri}
                width={`${rowWidthMm}mm`}
                height={`${rowHeightMm}mm`}
                viewBox={`0 0 ${layout.perLine * 100} 120`}
                onClick={(e) => handleRowClick(row, e)}
              >
                <RowContent row={row} layout={layout} selectedChar={plain ? undefined : selectedChar} pinyinFor={pinyinFor} />
              </svg>
            ))}
          </div>
          <div className="sheet-footer" data-page-num={pi + 1}>
            第 {pi + 1} 页 / 共 {pages.length} 页
          </div>
        </div>
      ))}
    </div>
  );
});
