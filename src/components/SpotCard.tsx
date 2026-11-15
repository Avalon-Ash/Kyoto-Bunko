/**
 * @layer UI / SpotCard（景點卡片）
 * @module SpotCard
 *
 * 本元件負責單一 FlatSpot 的視覺渲染，採用「京都漆藝」風格設計。
 * 同時內建「Query Assembly System」，負責將 spot.jaName 組裝為
 * Google Maps Search URL。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Query Assembly System — 組裝流程
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * SSOT 原則：所有關鍵字組裝以 spot.jaName (JA locale name) 為唯一事實來源。
 *
 * Step 1 — Query 組裝：
 *   以 spot.jaName（JA locale name）為主詞，
 *   附加行政區日文名稱（wardJa）與「京都」為地域錨點。
 *   格式：{JA名稱}+{行政區日文}+京都；周邊跨市景點改用 {JA名稱}+{市}+{府縣}。
 *
 * Step 2 — URL 組裝：
 *   所有參數經 encodeURIComponent 處理後以 + 串接。
 *   固定使用 maps/search/?api=1&query=...
 *   ⚠️ 禁止使用 maps/dir/（點對點導航端點）
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 金銀圖紋與文庫條目共用呈現。
 *
 * SSOT 原則與禁則
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * - 禁止在本元件硬編碼任何標籤字串，一律透過 TAG_REGISTRY 查詢
 * - 禁止使用 maps/dir/ 端點
 * - reservationRequired badge 以 spot.reservationRequired 布林值為唯一判斷基準
 *   禁止用 tagIds 字串替代此欄位
 * - 一律附 Google Maps 導航連結（buildGoogleMapsUrl）
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { animate } from 'motion/react';
import { cardPose, createFrameGate, movedPastSlop, wantsPress, wantsTilt } from '../lib/card-fx';
import { MakieIcon } from './MakieIcon';
import { typeMotifs } from '../lib/makie-icons';
import { FlatSpot, Lang } from '../types';
import { WARD_NAMES, AREA_NAMES, TYPE_NAMES } from '../data/index';
import { TAG_REGISTRY } from '../data/tags';
import { getSpotLocation } from '../data/municipalities';

interface SpotCardProps {
  spot: FlatSpot;
  lang: Lang;
  t: (key: string, dict?: Record<string, { zh: string; ja: string }>) => string;
  activeTag?: string | null;
}

const MAPS_SEARCH = 'https://www.google.com/maps/search/?api=1&query=';
const STANDALONE_NAMES = ['先斗町公園', '嵐山', '祇園', '哲学の道', '鴨川'];

/**
 * Query Assembly System：由 spot.jaName 組裝 Google Maps Search URL。
 * 地圖叢集面板（ClusterMap）等其他入口必須共用本函式，禁止自行拼接查詢字串。
 */
export function buildGoogleMapsUrl(spot: Pick<FlatSpot, 'jaName' | 'wardId' | 'municipalityId'>): string {
  const wardJa = WARD_NAMES[spot.wardId]?.ja ?? '';
  const location = getSpotLocation(spot);

  let queryName = spot.jaName || '';

  // 移除括號內的補充說明，例如 "(けいおん!聖地)"、"(禅林寺)"，避免干擾 Google Maps 精準搜尋
  queryName = queryName.replace(/[\(（].*?[\)）]/g, '').trim();

  // 特例處理：先斗町在 Google Maps 搜尋經常失效，替換為具體的「先斗町公園」作為錨點
  if (queryName === '先斗町') {
    queryName = '先斗町公園';
  }

  // Query Assembly System — 預設組裝規則與例外策略
  // 依固有名詞特徵判斷查詢策略：若為特定廣域名稱或街道，排除行政區以避免 Google Maps 搜尋失敗
  const isStandalone = STANDALONE_NAMES.some(name => queryName.includes(name));

  // 1. JA locale 的 spot.name
  // 2. 行政區日文名稱 (若為 isStandalone 則排除)
  // 3. "京都"
  const queryParts = location.isNearby
    ? [queryName, location.city.ja, location.prefecture.ja]
    : isStandalone ? [queryName, '京都'] : [queryName, wardJa, '京都'];

  const finalQuery = queryParts.filter(Boolean).map(p => encodeURIComponent(p.trim())).join('+');

  return MAPS_SEARCH + finalQuery;
}

/** The app's own reduced-motion switch (data attribute on the app root) or the system setting. */
function reducedMotionNow(el: Element): boolean {
  return Boolean(el.closest('[data-reduced-motion="true"]')) || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const setTilt = (el: HTMLElement, rx: number, ry: number) => {
  el.style.setProperty('--tilt-x', `${rx.toFixed(2)}deg`);
  el.style.setProperty('--tilt-y', `${ry.toFixed(2)}deg`);
};
const setGlow = (el: HTMLElement, gx: number, gy: number) => {
  el.style.setProperty('--glow-x', `${gx.toFixed(1)}%`);
  el.style.setProperty('--glow-y', `${gy.toFixed(1)}%`);
};
const poseAt = (el: HTMLElement, clientX: number, clientY: number) => {
  const r = el.getBoundingClientRect();
  return cardPose({ x: clientX - r.left, y: clientY - r.top, width: r.width, height: r.height });
};

/**
 * Tilt and gloss for one card, driven by events only: CSS variables are written at most once per frame
 * while a mouse is over the card, and nothing runs when it is not. The return to rest is a short `motion` spring.
 * Touch gets a press (a small dip and a gloss under the finger) that is dropped the moment the touch becomes a scroll.
 */
function useCardFx() {
  const s = useRef<{ gate: ReturnType<typeof createFrameGate> | null; stop?: () => void; rx: number; ry: number; timer: number; end: number; x0: number; y0: number }>(
    { gate: null, rx: 0, ry: 0, timer: 0, end: 0, x0: 0, y0: 0 });
  const clearPress = (el: HTMLElement) => {
    const st = s.current;
    window.clearTimeout(st.timer);
    el.removeAttribute('data-pressed');
    window.clearTimeout(st.end);
    st.end = window.setTimeout(() => { if (!el.hasAttribute('data-pressed')) el.removeAttribute('data-fx'); }, 450);
  };
  const onPointerEnter = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget, st = s.current;
    if (!wantsTilt(e.pointerType, reducedMotionNow(el))) return;
    st.stop?.(); st.stop = undefined;
    st.gate ??= createFrameGate(cb => requestAnimationFrame(cb), id => cancelAnimationFrame(id));
    el.setAttribute('data-fx', 'mouse');
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget, st = s.current;
    if (e.pointerType === 'touch') {
      if (el.hasAttribute('data-pressed') || st.timer) {
        if (movedPastSlop(e.clientX - st.x0, e.clientY - st.y0)) clearPress(el);
      }
      return;
    }
    if (el.getAttribute('data-fx') !== 'mouse' || !st.gate) return;
    const { clientX, clientY } = e;
    st.gate.push(() => {
      const p = poseAt(el, clientX, clientY);
      st.rx = p.rotateX; st.ry = p.rotateY;
      setTilt(el, p.rotateX, p.rotateY); setGlow(el, p.glowX, p.glowY);
    });
  }, []);
  const onPointerLeave = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget, st = s.current;
    if (el.getAttribute('data-fx') !== 'mouse') return;
    st.gate?.cancel();
    const { rx, ry } = st;
    const controls = animate(1, 0, {
      type: 'spring', stiffness: 260, damping: 20,
      onUpdate: v => setTilt(el, rx * v, ry * v),
      onComplete: () => { el.removeAttribute('data-fx'); st.stop = undefined; },
    });
    st.stop = () => controls.stop();
  }, []);
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget, st = s.current;
    if (!wantsPress(e.pointerType, reducedMotionNow(el))) return;
    const p = poseAt(el, e.clientX, e.clientY);
    setGlow(el, p.glowX, p.glowY);
    st.x0 = e.clientX; st.y0 = e.clientY;
    window.clearTimeout(st.timer); window.clearTimeout(st.end);
    // Wait a beat so a swipe that starts on a card never flashes the press.
    st.timer = window.setTimeout(() => { st.timer = 0; el.setAttribute('data-fx', 'touch'); el.setAttribute('data-pressed', ''); }, 70);
  }, []);
  const onPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') clearPress(e.currentTarget);
  }, []);
  useEffect(() => () => { const st = s.current; st.stop?.(); st.gate?.cancel(); window.clearTimeout(st.timer); window.clearTimeout(st.end); }, []);
  return { onPointerEnter, onPointerLeave, onPointerMove, onPointerDown, onPointerUp, onPointerCancel: onPointerUp };
}

export function SpotCard({ spot, lang, t, activeTag }: SpotCardProps) {
  const location = getSpotLocation(spot);
  const area = location.isNearby ? t('nearby_trip') : t(spot.areaId, AREA_NAMES);
  const ward = location.isNearby ? `${location.prefecture[lang]} · ${location.city[lang]}` : t(spot.wardId, WARD_NAMES);
  const tags = spot.tagIds?.length
    ? spot.tagIds.map(id => ({ id, label: TAG_REGISTRY[id]?.label[lang] ?? id }))
    : spot.tags.split(',').filter(Boolean).map(label => ({ id: label, label: label.trim() }));
  const fx = useCardFx();
  return <article className="spot-entry" aria-label={spot.name} {...fx}>
    <div className="spot-meta"><span>{area} · {ward}</span><small>{spot.id}</small></div>
    <h3><MakieIcon motif={typeMotifs[spot.typeId] ?? 'all'} /><span>{spot.name}</span></h3>
    <p className="spot-description">{spot.desc}</p>
    <div className="spot-tags">
      <span className="spot-kind">{t(spot.typeId, TYPE_NAMES)}</span>
      {spot.reservationRequired && <span className="reservation">{t('reservation')}</span>}
      {tags.map(tag => <span key={tag.id} data-active={activeTag === tag.id}>{tag.label}</span>)}
    </div>
    <a className="spot-navigation" href={buildGoogleMapsUrl(spot)} target="_blank" rel="noopener noreferrer">
      <MakieIcon motif="map" /><span>{t('btn_map')}</span><span aria-hidden="true">↗</span>
    </a>
  </article>;
}
