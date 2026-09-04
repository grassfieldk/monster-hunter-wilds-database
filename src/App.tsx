import { Anchor, AppShell, Box, Button, Container, Drawer, Group, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPackage, IconSearch, IconSwords } from '@tabler/icons-react';
import { Link, Route, Routes } from 'react-router-dom';
import { SearchBox } from './components/SearchBox';
import { DatabaseProvider } from './data';
import { HomePage } from './pages/HomePage';
import { ItemPage } from './pages/ItemPage';
import { ItemsPage } from './pages/ItemsPage';
import { MonsterPage } from './pages/MonsterPage';
import { MonstersPage } from './pages/MonstersPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  const [searchOpened, { open: openSearch, close: closeSearch }] = useDisclosure(false);

  return (
    <DatabaseProvider>
      <AppShell
        header={{ height: { base: 0, sm: 60 } }}
        footer={{ height: { base: 64, sm: 0 }, offset: true }}
        padding={{ base: 'xs', sm: 'md' }}
      >
        <AppShell.Header visibleFrom="sm">
          <Container size="lg" h="100%" px={{ base: 'xs', sm: 'md' }}>
            <Group h="100%" justify="space-between" wrap="nowrap">
              <Anchor component={Link} to="/" c="inherit" underline="never">
                <Text fw={600} visibleFrom="xs">MHWilds データベース</Text>
                <Text fw={600} hiddenFrom="xs">MHWilds DB</Text>
              </Anchor>
              <Group visibleFrom="sm" gap="lg">
                <Anchor component={Link} to="/monsters" c="inherit">モンスター</Anchor>
                <Anchor component={Link} to="/items" c="inherit">アイテム</Anchor>
              </Group>
              <Box visibleFrom="sm" style={{ width: 'min(42vw, 360px)' }}>
                <SearchBox />
              </Box>
            </Group>
          </Container>
        </AppShell.Header>
        <AppShell.Footer hiddenFrom="sm" p={4}>
          <Group grow gap={4} h="100%" align="stretch">
            <Button variant="subtle" size="sm" h="100%" p={4} onClick={openSearch} styles={{ inner: { flexDirection: 'column', gap: 2 } }}>
              <IconSearch size={18} />
              <Text size="xs" lh={1}>検索</Text>
            </Button>
            <Button component={Link} to="/monsters" variant="subtle" size="sm" h="100%" p={4} styles={{ inner: { flexDirection: 'column', gap: 2 } }}>
              <IconSwords size={18} />
              <Text size="xs" lh={1}>モンスター</Text>
            </Button>
            <Button component={Link} to="/items" variant="subtle" size="sm" h="100%" p={4} styles={{ inner: { flexDirection: 'column', gap: 2 } }}>
              <IconPackage size={18} />
              <Text size="xs" lh={1}>アイテム</Text>
            </Button>
          </Group>
        </AppShell.Footer>
        <Drawer opened={searchOpened} onClose={closeSearch} title="検索" position="bottom" size="auto" padding="md">
          <SearchBox large onNavigate={closeSearch} />
        </Drawer>
        <AppShell.Main>
          <Container size="lg" px={{ base: 0, sm: 'md' }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/monsters" element={<MonstersPage />} />
              <Route path="/monsters/:id" element={<MonsterPage />} />
              <Route path="/items" element={<ItemsPage />} />
              <Route path="/items/:id" element={<ItemPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Container>
        </AppShell.Main>
      </AppShell>
    </DatabaseProvider>
  );
}
