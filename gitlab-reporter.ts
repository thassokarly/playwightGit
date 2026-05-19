import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

class GitLabReporter implements Reporter {
  // Lista para guardar os testes que falharam
  private failedTests: Array<{ test: TestCase, result: TestResult }> = [];

  // Passo 1: O Playwright chama isso pra cada teste. Se falhar, guardamos na lista.
  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'failed' || result.status === 'timedOut') {
      this.failedTests.push({ test, result });
    }
  }

  // Passo 2: O Playwright chama isso no final de TUDO e "espera" a gente terminar.
  async onEnd(result: FullResult) {
    // Se nenhum teste falhou, não faz nada
    if (this.failedTests.length === 0) {
      return;
    }

    const projectId = process.env.CI_PROJECT_ID || '79723642'; 
    const token = process.env.GITLAB_TOKEN;

    if (!projectId || !token) {
      console.log('⚠️ Variáveis CI_PROJECT_ID ou GITLAB_TOKEN não encontradas. Issues não criadas.');
      return;
    }

    // Para cada teste que falhou na nossa lista, abrimos uma Issue
    for (const failed of this.failedTests) {
      const status = failed.result.status;
      const errorMessage = failed.result.error?.message || 'Erro desconhecido durante a execução.';
      
      const screenshot = failed.result.attachments.find(a => a.contentType.startsWith('image/'));
      const printPath = screenshot ? screenshot.path : 'Nenhum print salvo';

      const issueTitle = `🚨 Falha no Teste: ${failed.test.title}`;
      const issueDescription = `
### Resultado da Execução
* **Status:** ${status.toUpperCase()}
* **Arquivo do Teste:** ${failed.test.location.file}
* **Caminho do Print no Runner:** ${printPath}

### Log de Erro
\`\`\`
${errorMessage}
\`\`\`
      `;

      try {
        const response = await fetch(`https://gitlab.com/api/v4/projects/${projectId}/issues`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'PRIVATE-TOKEN': token
          },
          body: JSON.stringify({
            title: issueTitle,
            description: issueDescription,
            labels: `automacao,playwright,bug,${status}` 
          })
        });

        if (response.ok) {
          console.log(`✅ Issue criada no GitLab para a falha do teste: ${failed.test.title}`);
        } else {
          console.error(`❌ Falha ao criar issue no GitLab para o teste '${failed.test.title}'. Status da API: ${response.status}`);
        }
      } catch (err) {
        console.error('Erro ao conectar com a API do GitLab:', err);
      }
    }
  }
}

export default GitLabReporter;