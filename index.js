import {AppRegistry} from 'react-native';
import App from './App';
import {name} from './app.json';
import {initializePlugin} from './src/runtime';

AppRegistry.registerComponent(name, () => App);
initializePlugin().catch(error => console.error('LocalImage initialization:', error));
