import { Box, Tabs } from '@mantine/core';
import { Link, useLocation } from 'react-router-dom';
import { useDatabase } from '../data';
import { itemCategoryKinds, itemCategoryLabels } from '../itemCategories';

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

  if (/^\/items\/[^/]+$/u.test(pathname)) {
    return [
      { label: '基本情報', target: 'item-basic' },
      { label: '入手方法', target: 'item-sources' },
      { label: '使用用途', target: 'item-uses' },
    ];
  }

  return [];
}

export function SectionTabs() {
  const { pathname, search, hash } = useLocation();
  const { items } = useDatabase();
  const tabs = getSectionTabs(pathname, new Set(items.map((item) => item.kind)));
  if (!tabs.length) return null;
  const selected = pathname === '/items' ? new URLSearchParams(search).get('kind') : hash.slice(1);
  const fallback = pathname.startsWith('/monsters/') ? 'monster-rewards'
    : pathname.startsWith('/items/') ? 'item-sources'
      : tabs[0].target;
  const defaultValue = tabs.some((tab) => tab.target === selected) ? selected : fallback;

  return (
    <Box className="section-tabs" hiddenFrom="sm">
      <Tabs key={`${pathname}${search}${hash}`} defaultValue={defaultValue} variant="default" inverted>
        <Tabs.List grow>
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
