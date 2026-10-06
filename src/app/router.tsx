import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Navigate,
  Outlet,
  type RouterHistory,
} from '@tanstack/react-router';
import { Loading } from '../components/States';
import { AppGate } from '../routes/AppGate';
import { safeReturnPath } from './returnPath';
import { LoginPage } from '../routes/LoginPage';

// Seiten nach Bedarf laden: Markdown und Chat nur, wenn der Chat geöffnet wird.
const DashboardPage = lazyRouteComponent(() => import('../routes/DashboardPage'), 'DashboardPage');
const ChatRoute = lazyRouteComponent(() => import('../routes/ChatRoute'), 'ChatRoute');
const ChatIndexRoute = lazyRouteComponent(() => import('../routes/ChatRoute'), 'ChatIndexRoute');
const DocumentsPage = lazyRouteComponent(() => import('../routes/DocumentsPage'), 'DocumentsPage');
const TasksPage = lazyRouteComponent(() => import('../routes/TasksPage'), 'TasksPage');
const SettingsPage = lazyRouteComponent(() => import('../routes/SettingsPage'), 'SettingsPage');

function Root() {
  return (
    <>
      <a className="skip" href="#main">
        Zum Inhalt springen
      </a>
      <Outlet />
    </>
  );
}

const rootRoute = createRootRoute({ component: Root, notFoundComponent: () => <Navigate to="/" replace /> });
export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/anmelden',
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>): { weiter?: string } => {
    const weiter = safeReturnPath(search.weiter);
    return weiter ? { weiter } : {};
  },
});
const appRoute = createRoute({ getParentRoute: () => rootRoute, id: 'app', component: AppGate });
const dashboardRoute = createRoute({ getParentRoute: () => appRoute, path: '/', component: DashboardPage });
const chatIndexRoute = createRoute({ getParentRoute: () => appRoute, path: '/gespraeche', component: ChatIndexRoute });
export const chatRoute = createRoute({ getParentRoute: () => appRoute, path: '/gespraeche/$conversationId', component: ChatRoute });
const documentsRoute = createRoute({ getParentRoute: () => appRoute, path: '/dokumente', component: DocumentsPage });
const tasksRoute = createRoute({ getParentRoute: () => appRoute, path: '/aufgaben', component: TasksPage });
const settingsRoute = createRoute({ getParentRoute: () => appRoute, path: '/einstellungen', component: SettingsPage });

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([dashboardRoute, chatIndexRoute, chatRoute, documentsRoute, tasksRoute, settingsRoute]),
]);

export function createAppRouter(history?: RouterHistory) {
  return createRouter({
    routeTree,
    ...(history ? { history } : {}),
    defaultPreload: false,
    scrollRestoration: false,
    defaultPendingComponent: () => (
      <div className="p-6">
        <Loading label="Seite wird geladen …" />
      </div>
    ),
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
