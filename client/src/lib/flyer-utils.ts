import html2canvas from 'html2canvas';

export async function downloadFlyerAsPNG(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  try {
    // Hide action buttons and other elements before capturing
    const actionButtons = document.querySelectorAll('.no-print');
    const originalDisplays: string[] = [];
    
    actionButtons.forEach((btn, index) => {
      const htmlBtn = btn as HTMLElement;
      originalDisplays[index] = htmlBtn.style.display;
      htmlBtn.style.display = 'none';
    });

    // Wait a bit for the UI to update
    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
      logging: false,
      removeContainer: true,
    });

    // Restore action buttons
    actionButtons.forEach((btn, index) => {
      (btn as HTMLElement).style.display = originalDisplays[index] || '';
    });

    // Create download link
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${filename.replace(/[^a-zA-Z0-9-_]/g, '_')}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }, 'image/png', 0.95);

  } catch (error) {
    // Restore action buttons in case of error
    const actionButtons = document.querySelectorAll('.no-print');
    actionButtons.forEach(btn => {
      (btn as HTMLElement).style.display = '';
    });
    console.error('Error generating PNG:', error);
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
