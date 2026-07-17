import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
// Bundled fonts (fully offline — no Google Fonts CDN). Used by Junk Mage's retro UI.
import '@fontsource/vt323'
import '@fontsource/silkscreen/400.css'
import '@fontsource/silkscreen/700.css'
import './styles/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
