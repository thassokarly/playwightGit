import { test, expect } from '@playwright/test';

test('Verifica se Hello World está escrito corretamente', async () => {
  const texto = 'Hello World';
  await expect(texto).toBe('Hello World');
});

test('Verifica se Hello World está escrito corretamente2.0', async () => {
  const texto2 = 'Hello World';
  await expect(texto2).toBe('Helo World');
});
