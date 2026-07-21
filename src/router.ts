import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { layouts } from './layouts/index';
import HomePage from './pages/Home.page.vue';
import NotFound from './pages/404.page.vue';
import { tools } from './tools';
import { config } from './config';

const toolsRoutes = tools.map(({ path, name, component, ...config }) => ({
  path,
  name,
  component,
  meta: { isTool: true, layout: layouts.toolLayout, name, ...config },
}));
const toolsRedirectRoutes = tools
  .filter(({ redirectFrom }) => redirectFrom && redirectFrom.length > 0)
  .flatMap(
    ({ path, redirectFrom }) => redirectFrom?.map(redirectSource => ({ path: redirectSource, redirect: path })) ?? [],
  );

const router = createRouter({
  history: createWebHistory(config.app.baseUrl),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('./pages/About.vue'),
    },
    ...toolsRoutes,
    ...toolsRedirectRoutes,
    { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound },
  ],
});

if (import.meta.env.DEV) {
  import('./ui/demo/demo.routes').then(({ routes }) => {
    routes.forEach(route => router.addRoute(route as RouteRecordRaw));

    if (router.currentRoute.value.name === 'NotFound' && router.currentRoute.value.path.startsWith('/c-lib')) {
      router.replace(router.currentRoute.value.fullPath);
    }
  });
}

export default router;
