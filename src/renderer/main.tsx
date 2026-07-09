import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Error boundary para capturar erros no renderer e mostrar diagnóstico
class ErrorBoundary extends React.Component<{children:React.ReactNode},{err:string|null,stack:string}> {
  state = { err: null, stack: '' };
  static getDerivedStateFromError(e: Error) { return { err: e.message, stack: e.stack ?? '' }; }
  render() {
    if (this.state.err) return (
      <div style={{padding:24,fontFamily:'monospace',fontSize:13,background:'#fee2e2',minHeight:'100vh',whiteSpace:'pre-wrap'}}>
        <h2 style={{color:'#dc2626',fontSize:16}}>❌ Erro ao inicializar o LumenSolar</h2>
        <p style={{marginTop:8,color:'#991b1b'}}>{this.state.err}</p>
        <details style={{marginTop:12}}>
          <summary style={{cursor:'pointer',color:'#7f1d1d'}}>Stack trace</summary>
          <pre style={{fontSize:11,marginTop:8,overflow:'auto'}}>{this.state.stack}</pre>
        </details>
      </div>
    );
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
