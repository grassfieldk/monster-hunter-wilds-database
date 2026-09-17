import { ActionIcon, Anchor, AppShell, Badge, Box, Container, Group, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArrowLeft, IconArrowRight, IconArrowUp, IconClipboardList, IconPackage, IconPaw, IconSearch, IconShield } from '@tabler/icons-react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { SearchBox } from './components/SearchBox';
import { SectionTabs } from './components/SectionTabs';
import { DatabaseProvider, monsterEpithet, text, useDatabase } from './data';
import { label } from './labels';
import { HomePage } from './pages/HomePage';
import { ItemPage } from './pages/ItemPage';
import { ItemsPage } from './pages/ItemsPage';
import { MonsterPage } from './pages/MonsterPage';
import { MonstersPage } from './pages/MonstersPage';
import { QuestsPage } from './pages/QuestsPage';
import { QuestPage } from './pages/QuestPage';
import { EquipmentPage } from './pages/EquipmentPage';
import { NotFoundPage } from './pages/NotFoundPage';

function MobileHeaderContent() {
  const { pathname } = useLocation();
  const { monsterById, itemById, questById, armor, armorSeries, amulets, weapons, decorations } = useDatabase();
  const monsterMatch = pathname.match(/^\/monsters\/([^/]+)$/u);
  const itemMatch = pathname.match(/^\/items\/([^/]+)$/u);
  const questMatch = pathname.match(/^\/quests\/([^/]+)$/u);
  const equipmentMatch = pathname.match(/^\/equipment\/([^/]+)\/([^/]+)$/u);

  if (pathname === '/') return <Text size="md" fw={600}>Monster Hunter Wilds DB</Text>;
  if (pathname === '/monsters') return <Text size="md" fw={600}>モンスター一覧</Text>;
  if (pathname === '/items') return <Text size="md" fw={600}>アイテム一覧</Text>;
  if (pathname === '/quests') return <Text size="md" fw={600}>クエスト一覧</Text>;
  if (pathname === '/equipment') return <Text size="md" fw={600}>装備一覧</Text>;

  if (monsterMatch) {
    const monster = monsterById.get(Number(monsterMatch[1]));
    if (monster) {
      const monsterName = text(monster.names);
      const epithet = monsterEpithet(monster);
      const epithetReading = epithet?.match(/^(.+?)（(.+?)）$/u);
      return (
        <Group w="100%" gap="xs" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" miw={0}>
            <Badge size="sm" variant="light">{label(monster.species)}</Badge>
            <Text size="md" fw={600} truncate>{monsterName}</Text>
          </Group>
          {epithet && (
            <Text size="md" fw={600} ta="right" truncate>
              {epithetReading ? <ruby className="monster-epithet">{epithetReading[1]}<rt>{epithetReading[2]}</rt></ruby> : <span className="monster-epithet">{epithet}</span>}
            </Text>
          )}
        </Group>
      );
    }
  }

  if (itemMatch) {
    const item = itemById.get(Number(itemMatch[1]));
    if (item) {
      return (
        <Group w="100%" gap="xs" wrap="nowrap">
          <Badge size="sm" variant="light">RARE {item.rarity}</Badge>
          <Text size="md" fw={600} truncate>{text(item.names)}</Text>
          <Text size="sm" c="dimmed" truncate>{label(item.kind)}</Text>
        </Group>
      );
    }
  }

  if (questMatch) {
    const quest = questById.get(Number(questMatch[1]));
    if (quest) {
      return (
        <Group gap="xs" wrap="nowrap" miw={0}>
          <Badge size="sm" variant="light">{quest.category}</Badge>
          <Text size="md" fw={600} truncate>{text(quest.names)}</Text>
        </Group>
      );
    }
  }

  if (equipmentMatch) {
    const [, kind, encodedId] = equipmentMatch;
    const equipmentId = decodeURIComponent(encodedId);
    const equipment = kind === 'weapons' ? weapons.find((entry) => entry.game_id === equipmentId)
      : kind === 'armor' ? armorSeries.find((entry) => entry.game_id === Number(equipmentId)) ?? armorSeries.find((entry) => entry.game_id === armor.find((item) => item.game_id === equipmentId)?.series_id)
        : kind === 'amulets' ? amulets.find((entry) => entry.game_id === equipmentId)
          : decorations.find((entry) => String(entry.game_id) === equipmentId);
    if (equipment) {
      const category = kind === 'weapons' ? (equipment as typeof weapons[number]).category : kind === 'armor' ? '防具' : kind === 'amulets' ? '護石' : '装飾品';
      return <Group w="100%" gap="xs" wrap="nowrap"><Badge size="sm" variant="light">{category}</Badge><Text size="md" fw={600} truncate>{text(equipment.names)}</Text></Group>;
    }
  }

  return null;
}

export function App() {
  const { pathname, search, hash } = useLocation();
  const [searchOpened, { open: openSearch, close: closeSearch }] = useDisclosure(false);
  const scrollPositions = useRef(new Map<string, number>());
  const monstersActive = pathname.startsWith('/monsters');
  const itemsActive = pathname.startsWith('/items');
  const equipmentActive = pathname.startsWith('/equipment');
  const parentMatch = pathname.match(/^\/(monsters|items|equipment)\/[^/]+$/u);
  const parentPath = parentMatch ? `/${parentMatch[1]}` : '/';

  const scrollKey = `${pathname}${search}${hash}`;
  useEffect(() => {
    window.scrollTo({ top: scrollPositions.current.get(scrollKey) ?? 0, left: 0, behavior: 'auto' });
    return () => {
      scrollPositions.current.set(scrollKey, window.scrollY);
    };
  }, [scrollKey]);

  return (
    <DatabaseProvider>
      <AppShell
        header={{ height: { base: 44, sm: 60 } }}
        footer={{ height: { base: 44, sm: 0 }, offset: true }}
        padding={{ base: 'xs', sm: 'md' }}
      >
        <AppShell.Header>
          <Box hiddenFrom="sm" h="100%" px="xs" className="mobile-header-content">
            <MobileHeaderContent />
          </Box>
          <Container visibleFrom="sm" size="lg" h="100%" px={{ base: 'xs', sm: 'md' }}>
            <Group h="100%" justify="space-between" wrap="nowrap">
              <Anchor component={Link} to="/" c="inherit" underline="never">
                <Text fw={600} visibleFrom="xs">MHWilds データベース</Text>
                <Text fw={600} hiddenFrom="xs">MHWilds DB</Text>
              </Anchor>
              <Group visibleFrom="sm" gap="lg">
                <Anchor component={Link} to="/monsters" c="inherit">モンスター</Anchor>
                <Anchor component={Link} to="/items" c="inherit">アイテム</Anchor>
                <Anchor component={Link} to="/quests" c="inherit">クエスト</Anchor>
                <Anchor component={Link} to="/equipment" c="inherit">装備</Anchor>
              </Group>
              <Box visibleFrom="sm" style={{ width: 'min(42vw, 360px)' }}>
                <SearchBox />
              </Box>
            </Group>
          </Container>
        </AppShell.Header>
        <AppShell.Footer hiddenFrom="sm" p={0} className="mobile-footer">
          <SectionTabs />
          <Group gap={0} h="100%" align="stretch" className="mobile-footer-nav">
            <Group gap={0} h="100%" px={8} wrap="nowrap" className="footer-icon-group">
              <ActionIcon variant="subtle" size="lg" h="100%" w={36} aria-label="戻る" title="戻る" className="footer-history-button" onClick={() => window.history.back()}>
                <IconArrowLeft size={18} />
              </ActionIcon>
              <ActionIcon variant="subtle" size="lg" h="100%" w={36} aria-label="進む" title="進む" className="footer-history-button" onClick={() => window.history.forward()}>
                <IconArrowRight size={18} />
              </ActionIcon>
              <ActionIcon component={Link} to={parentPath} variant="subtle" size="lg" h="100%" w={36} aria-label="一つ上へ" title="一つ上へ" className="footer-history-button" disabled={parentPath === pathname}>
                <IconArrowUp size={18} />
              </ActionIcon>
              <ActionIcon variant="subtle" size="lg" h="100%" w={36} aria-label="検索" title="検索" className="footer-search-button" data-active={searchOpened || undefined} onClick={searchOpened ? closeSearch : openSearch}>
                <IconSearch size={18} stroke={2.25} />
              </ActionIcon>
            </Group>
            <ActionIcon component={Link} to="/monsters" variant="subtle" size="lg" h="100%" aria-label="モンスター" title="モンスター" data-active={monstersActive || undefined} className="footer-main-button" onClick={closeSearch}>
              <IconPaw size={18} />
            </ActionIcon>
            <ActionIcon component={Link} to="/items" variant="subtle" size="lg" h="100%" aria-label="アイテム" title="アイテム" data-active={itemsActive || undefined} className="footer-main-button" onClick={closeSearch}>
              <IconPackage size={18} />
            </ActionIcon>
            <ActionIcon component={Link} to="/quests" variant="subtle" size="lg" h="100%" aria-label="クエスト" title="クエスト" data-active={pathname.startsWith('/quests') || undefined} className="footer-main-button" onClick={closeSearch}>
              <IconClipboardList size={18} />
            </ActionIcon>
            <ActionIcon component={Link} to="/equipment" variant="subtle" size="lg" h="100%" aria-label="装備" title="装備" data-active={equipmentActive || undefined} className="footer-main-button" onClick={closeSearch}>
              <IconShield size={18} />
            </ActionIcon>
          </Group>
        </AppShell.Footer>
        {searchOpened && (
          <Box hiddenFrom="sm" className="mobile-search-panel">
            <SearchBox onNavigate={closeSearch} resultsPlacement="top" />
          </Box>
        )}
        <AppShell.Main className="main-with-section-tabs" onClick={closeSearch}>
          <Container size="lg" px={{ base: 0, sm: 'md' }}>
            <Box visibleFrom="sm" className="desktop-section-tabs">
              <SectionTabs />
            </Box>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/monsters" element={<MonstersPage />} />
              <Route path="/monsters/:id" element={<MonsterPage />} />
              <Route path="/items" element={<ItemsPage />} />
              <Route path="/items/:id" element={<ItemPage />} />
              <Route path="/quests" element={<QuestsPage />} />
              <Route path="/quests/:id" element={<QuestPage />} />
              <Route path="/equipment" element={<EquipmentPage />} />
              <Route path="/equipment/:kind/:id" element={<EquipmentPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Container>
        </AppShell.Main>
      </AppShell>
    </DatabaseProvider>
  );
}
