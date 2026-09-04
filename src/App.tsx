import { Anchor, AppShell, Burger, Container, Group, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
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
  const [opened, { toggle, close }] = useDisclosure();

  return (
    <DatabaseProvider>
      <AppShell
        header={{ height: 60 }}
        navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened, desktop: true } }}
        padding="md"
      >
        <AppShell.Header>
          <Container size="lg" h="100%">
            <Group h="100%" justify="space-between" wrap="nowrap">
              <Group wrap="nowrap">
                <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                <Anchor component={Link} to="/" c="inherit" underline="never">
                  <Text fw={600} visibleFrom="xs">MHWilds データベース</Text>
                  <Text fw={600} hiddenFrom="xs">MHWilds DB</Text>
                </Anchor>
              </Group>
              <Group visibleFrom="sm" gap="lg">
                <Anchor component={Link} to="/monsters" c="inherit">モンスター</Anchor>
                <Anchor component={Link} to="/items" c="inherit">アイテム</Anchor>
              </Group>
              <div style={{ width: 'min(42vw, 360px)' }}>
                <SearchBox />
              </div>
            </Group>
          </Container>
        </AppShell.Header>
        <AppShell.Navbar p="md">
          <Anchor component={Link} to="/monsters" py="sm" onClick={close}>モンスター</Anchor>
          <Anchor component={Link} to="/items" py="sm" onClick={close}>アイテム</Anchor>
        </AppShell.Navbar>
        <AppShell.Main>
          <Container size="lg">
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
