import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Error boundary para capturar erros no renderer e mostrar diagnóstico
class ErrorBoundary extends React.Component<{children:React.ReactNode},{err:string|null,stack:string}> {
  state = { err: null, stack: '' };
  static getDerivedStateFromError(e: Error) { return { err: e.message, stack: e.stack ?? '' }; }
  // BUG CORRIGIDO (set/2026, mesma auditoria que achou o uncaughtException do
  // processo principal não encerrando nada): faltava `componentDidCatch` —
  // `getDerivedStateFromError` só atualiza o state pra mostrar a tela de erro,
  // não loga em lugar nenhum. Sem isso, um crash aqui não deixava NENHUM
  // rastro no console — só o que aparece na tela (que o usuário teria que
  // printar/fotografar manualmente). Mesmo padrão de "sempre registrar antes
  // de desistir" já usado nos handlers do processo principal.
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] erro capturado na árvore de render:', error, info.componentStack);
  }
  render() {
    if (this.state.err) return (
      <div style={{padding:24,fontFamily:'monospace',fontSize:13,background:'#fee2e2',minHeight:'100vh',whiteSpace:'pre-wrap'}}>
        {/* BUG CORRIGIDO (set/2026): dizia "ao inicializar", mas este boundary
            captura QUALQUER erro de render da árvore inteira, não só na
            inicialização — um crash horas depois de aberto (ex.: um cálculo
            que lança durante o render, como quase aconteceu com
            calcularBancoBaterias antes do clamp) mostraria essa mesma tela
            com uma mensagem que sugere "não abriu direito", quando na
            verdade abriu e quebrou depois. */}
        <h2 style={{color:'#dc2626',fontSize:16}}>❌ Erro inesperado no LumenSolar</h2>
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
