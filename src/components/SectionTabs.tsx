import { Box, Tabs } from '@mantine/core';
import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDatabase } from '../data';
import { itemCategoryKinds, itemCategoryLabels } from '../itemCategories';
import { getRememberedDetailSection } from '../sections';

type SectionTab = {
  label: string;
  target: string;
  to?: string;
};

function getSectionTabs(pathname: string, itemKinds: Set<string>): SectionTab[] {
  if (/^\/monsters\/[^/]+$/u.test(pathname)) {
    return [
      { label: '基本情報', target: 'monster-basic' },
      { label: '入手素材', target: 'monster-rewards' },
      { label: '部位・肉質', target: 'monster-hitzones' },
    ];
  }

  if (pathname === '/items') {
    return itemCategoryKinds
      .filter((kind) => itemKinds.has(kind))
      .map((kind) => ({ label: itemCategoryLabels[kind], target: kind, to: `/items?kind=${kind}#items-category` }));
  }

  if (pathname === '/equipment' || pathname === '/simulator') {
    return [
      { label: '武器', target: 'weapons', to: '/equipment?kind=weapons' },
      { label: '防具', target: 'armor', to: '/equipment?kind=armor' },
      { label: '護石', target: 'amulets', to: '/equipment?kind=amulets' },
      { label: '装飾品', target: 'decorations', to: '/equipment?kind=decorations' },
      { label: 'シミュレータ', target: 'simulator', to: '/simulator' },
    ];
  }

  if (/^\/items\/[^/]+$/u.test(pathname)) {
    return [
      { label: '基本情報', target: 'item-basic' },
      { label: '入手方法', target: 'item-sources' },
      { label: '使用用途', target: 'item-uses' },
    ];
  }

  if (/^\/quests\/[^/]+$/u.test(pathname)) {
    return [
      { label: '基本情報', target: 'quest-basic' },
      { label: '報酬アイテム', target: 'quest-rewards' },
    ];
  }

  return [];
}

export function SectionTabs() {
  const { pathname, search, hash } = useLocation();
  const { items } = useDatabase();
  const tabs = getSectionTabs(pathname, new Set(items.map((item) => item.kind)));
  const listRef = useRef<HTMLDivElement>(null);
  const selected =
    pathname === '/simulator'
      ? 'simulator'
      : pathname === '/items' || pathname === '/equipment'
        ? new URLSearchParams(search).get('kind')
        : hash.slice(1);
  const fallback = pathname.startsWith('/monsters/')
    ? getRememberedDetailSection('monster')
    : pathname.startsWith('/items/')
      ? getRememberedDetailSection('item')
      : pathname.startsWith('/quests/')
        ? getRememberedDetailSection('quest')
        : tabs[0]?.target;
  const defaultValue = tabs.some((tab) => tab.target === selected) ? selected : fallback;
  useEffect(() => {
    if (!defaultValue || !window.matchMedia('(max-width: 47.99em)').matches) return;
    listRef.current?.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [defaultValue]);
  if (!tabs.length) return null;

  return (
    <Box className="section-tabs">
      <Tabs value={defaultValue} variant="pills" inverted>
        <Tabs.List ref={listRef} grow>
          {tabs.map((tab) => (
            <Tabs.Tab
              key={tab.target}
              value={tab.target}
              renderRoot={(props) => <Link {...props} to={tab.to ?? `#${tab.target}`} />}
            >
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
    </Box>
  );
}
