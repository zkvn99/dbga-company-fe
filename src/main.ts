import { createApp } from 'vue'
import App from './App.vue'
import { APP_NAME, portals } from './portals'
import { createPortalRouter } from './shared/portal/router'
import './shared/ui/base.css'

createApp(App).use(createPortalRouter(APP_NAME, portals)).mount('#app')
