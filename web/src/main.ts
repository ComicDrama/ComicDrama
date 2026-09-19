import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query';
import App from './App.vue';

const queryClient = new QueryClient();

createApp(App).use(createPinia()).use(VueQueryPlugin, { queryClient }).mount('#app');
