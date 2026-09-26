import { ActionIcon, Anchor, AppShell, Box, Container, Group, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconArrowLeft,
  IconArrowRight,
  IconClipboardList,
  IconPackage,
  IconPaw,
  IconSearch,
  IconShield,
} from '@tabler/icons-react';
import { useEffect, useRef } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { MobileHeaderContent } from './components/MobileHeaderContent';
import { SearchBox } from './components/SearchBox';
import { SectionTabs } from './components/SectionTabs';
import { DatabaseProvider } from './data';
import { EquipmentPage } from './pages/EquipmentPage';
import { HomePage } from './pages/HomePage';
import { ItemPage } from './pages/ItemPage';
import { ItemsPage } from './pages/ItemsPage';
import { MonsterPage } from './pages/MonsterPage';
import { MonstersPage } from './pages/MonstersPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { QuestPage } from './pages/QuestPage';
import { QuestsPage } from './pages/QuestsPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { SkillPage } from './pages/SkillPage';

export function App() {
  const { pathname, search, hash } = useLocation();
  const [searchOpened, { open: openSearch, close: closeSearch }] = useDisclosure(false);
  const scrollPositions = useRef(new Map<string, number>());
  const monstersActive = pathname.startsWith('/monsters');
  const itemsActive = pathname.startsWith('/items');
  const equipmentActive = pathname.startsWith('/equipment') || pathname === '/simulator';
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
                <Text fw={600} visibleFrom="md">
                  MHWilds データベース
                </Text>
                <Text fw={600} hiddenFrom="md">
                  MHWilds DB
                </Text>
              </Anchor>
              <Group visibleFrom="sm" gap="xs" wrap="nowrap" className="desktop-header-nav">
                <Anchor component={Link} to="/monsters" c="inherit">
                  モンスター
                </Anchor>
                <Anchor component={Link} to="/items" c="inherit">
                  アイテム
                </Anchor>
                <Anchor component={Link} to="/quests" c="inherit">
                  クエスト
                </Anchor>
                <Anchor component={Link} to="/equipment" c="inherit">
                  装備
                </Anchor>
                <Anchor component={Link} to="/simulator" c="inherit">
                  シミュレータ
                </Anchor>
              </Group>
              <Box visibleFrom="sm" style={{ width: 'clamp(180px, 24vw, 360px)' }}>
                <SearchBox />
              </Box>
            </Group>
          </Container>
        </AppShell.Header>
        <AppShell.Footer hiddenFrom="sm" p={0} className="mobile-footer">
          <SectionTabs />
          <Group gap={0} h="100%" align="stretch" className="mobile-footer-nav">
            <Group gap={0} h="100%" px={8} wrap="nowrap" className="footer-icon-group">
              <ActionIcon
                variant="subtle"
                size="lg"
                h="100%"
                w={36}
                aria-label="戻る"
                title="戻る"
                className="footer-history-button"
                onClick={() => window.history.back()}
              >
                <IconArrowLeft size={18} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                size="lg"
                h="100%"
                w={36}
                aria-label="進む"
                title="進む"
                className="footer-history-button"
                onClick={() => window.history.forward()}
              >
                <IconArrowRight size={18} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                size="lg"
                h="100%"
                w={36}
                aria-label="検索"
                title="検索"
                className="footer-search-button"
                data-active={searchOpened || undefined}
                onClick={searchOpened ? closeSearch : openSearch}
              >
                <IconSearch size={18} stroke={2.25} />
              </ActionIcon>
            </Group>
            <ActionIcon
              component={Link}
              to="/monsters"
              variant="subtle"
              size="lg"
              h="100%"
              aria-label="モンスター"
              title="モンスター"
              data-active={monstersActive || undefined}
              className="footer-main-button"
              onClick={closeSearch}
            >
              <IconPaw size={18} />
            </ActionIcon>
            <ActionIcon
              component={Link}
              to="/items"
              variant="subtle"
              size="lg"
              h="100%"
              aria-label="アイテム"
              title="アイテム"
              data-active={itemsActive || undefined}
              className="footer-main-button"
              onClick={closeSearch}
            >
              <IconPackage size={18} />
            </ActionIcon>
            <ActionIcon
              component={Link}
              to="/quests"
              variant="subtle"
              size="lg"
              h="100%"
              aria-label="クエスト"
              title="クエスト"
              data-active={pathname.startsWith('/quests') || undefined}
              className="footer-main-button"
              onClick={closeSearch}
            >
              <IconClipboardList size={18} />
            </ActionIcon>
            <ActionIcon
              component={Link}
              to="/equipment"
              variant="subtle"
              size="lg"
              h="100%"
              aria-label="装備"
              title="装備"
              data-active={equipmentActive || undefined}
              className="footer-main-button"
              onClick={closeSearch}
            >
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
              <Route path="/skills/:id" element={<SkillPage />} />
              <Route path="/equipment" element={<EquipmentPage />} />
              <Route path="/equipment/:kind/:id" element={<EquipmentPage />} />
              <Route path="/simulator" element={<SimulatorPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Container>
        </AppShell.Main>
      </AppShell>
    </DatabaseProvider>
  );
}
