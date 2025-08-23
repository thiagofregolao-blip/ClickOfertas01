import html2canvas from 'html2canvas';

export async function downloadFlyerAsPNG(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  try {
    // Hide action buttons before capturing
    const actionButtons = document.querySelectorAll('.no-print');
    actionButtons.forEach(btn => {
      (btn as HTMLElement).style.display = 'none';
    });

    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
    });

    // Restore action buttons
    actionButtons.forEach(btn => {
      (btn as HTMLElement).style.display = '';
    });

    // Convert canvas to blob and download
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    // Restore action buttons in case of error
    const actionButtons = document.querySelectorAll('.no-print');
    actionButtons.forEach(btn => {
      (btn as HTMLElement).style.display = '';
    });
    throw error;
  }
}

export function formatCurrency(amount: string | number, currency: string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${currency} ${numAmount.toLocaleString('pt-BR')}`;
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
