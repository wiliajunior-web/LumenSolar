import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('solarpropv', {
  versao: '0.5.0',
});
