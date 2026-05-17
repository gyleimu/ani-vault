import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";
import "./styles/main.css";
import { vLazy } from './directives/lazy';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.directive('lazy', vLazy);

app.mount("#app");
