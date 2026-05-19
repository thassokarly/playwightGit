import { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

class GitLabReporter implements Reporter {
  async onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'passed' || result.status === 'skipped') {
      return; 
    }

    const status = result.status;
    const errorMessage = result.error?.message || 'Erro desconhecido durante a execução.';
    
    const screenshot = result.attachments.find(a => a.contentType.startsWith('image/'));
    const printPath = screenshot ? screenshot.path : 'Nenhum print salvo';

    const issueTitle = `🚨 Falha no Teste: ${test.title}`;
    const issueDescription = `
### Resultado da Execução
* **Status:** ${status.toUpperCase()}
* **Arquivo do Teste:** ${test.location.file}
* **Caminho do Print no Runner:** ${printPath}

### Log de Erro
\`\`\`
${errorMessage}
\`\`\`
    `;

    const projectId = process.env.CI_PROJECT_ID || '79723642'; 
    const token = process.env.GITLAB_TOKEN;

    if (projectId && token) {
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
          console.log(`✅ Issue criada no GitLab para a falha do teste: ${test.title}`);
        } else {
          console.error(`❌ Falha ao criar issue no GitLab. Status da API: ${response.status}`);
        }
      } catch (err) {
        console.error('Erro ao conectar com a API do GitLab:', err);
      }
    } else {
      console.log('⚠️ Variáveis de Projeto ou GITLAB_TOKEN não encontradas. Issue não criada.');
    }
  }
}

export default GitLabReporter;