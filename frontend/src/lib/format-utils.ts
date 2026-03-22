/**
 * Format utilities for valuation reports
 * TypeScript ports of Python functions from backend/utils/template.py
 */

/**
 * Convert a number to words with proper capitalization
 * Note: This is a simplified version. For full number-to-words conversion,
 * consider using a library like 'number-to-words' or 'written-number'
 */
export function formatCurrencyWords(amount: number | null | undefined): string {
  if (!amount) {
    return '';
  }

  try {
    // Convert to integer to remove cents
    const intAmount = Math.floor(Number(amount));

    // Basic implementation for common ranges
    // For a complete implementation, consider using a library
    const numberToWords = (num: number): string => {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
      const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      const thousands = ['', 'Thousand', 'Million', 'Billion'];

      if (num === 0) return 'Zero';

      let words = '';
      let groupIndex = 0;

      while (num > 0) {
        const group = num % 1000;

        if (group !== 0) {
          let groupWords = '';

          // Hundreds
          const hundreds = Math.floor(group / 100);
          if (hundreds > 0) {
            groupWords += ones[hundreds] + ' Hundred';
            if (group % 100 !== 0) groupWords += ' and ';
          }

          // Tens and ones
          const remainder = group % 100;
          if (remainder >= 10 && remainder < 20) {
            groupWords += teens[remainder - 10];
          } else {
            const tensDigit = Math.floor(remainder / 10);
            const onesDigit = remainder % 10;

            if (tensDigit > 0) {
              groupWords += tens[tensDigit];
              if (onesDigit > 0) groupWords += '-';
            }

            if (onesDigit > 0 || (remainder === 0 && hundreds === 0)) {
              groupWords += ones[onesDigit];
            }
          }

          if (thousands[groupIndex]) {
            groupWords += ' ' + thousands[groupIndex];
          }

          words = groupWords + (words ? ' ' + words : '');
        }

        num = Math.floor(num / 1000);
        groupIndex++;
      }

      return words.trim() + ' Dollars';
    };

    return numberToWords(intAmount);
  } catch {
    return '';
  }
}

/**
 * Format a date string or Date object to "DD Month YYYY" format
 * Example: "15 January 2024"
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) {
    return '';
  }

  try {
    let date: Date;

    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      // Assume ISO format YYYY-MM-DD
      date = new Date(dateInput);
    } else {
      return '';
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }

    // Format: DD Month YYYY
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  } catch {
    return '';
  }
}

/**
 * Format a list of owners into a comma-separated string with '&' before the last owner
 *
 * Example:
 * Input: [
 *   { firstName: 'Test 1', lastName: 'Ting 1' },
 *   { firstName: 'Test 2', lastName: 'Ting 2' },
 *   { firstName: 'Test 3', lastName: 'Ting 3' }
 * ]
 * Output: "Test 1 Ting 1, Test 2 Ting 2 & Test 3 Ting 3"
 */
export function formatOwners(owners: Array<{ firstName?: string; lastName?: string }> | null | undefined): string {
  if (!owners || !Array.isArray(owners)) {
    return '';
  }

  // Filter out owners with missing names and format them
  const validOwners: string[] = [];
  for (const owner of owners) {
    if (owner && owner.firstName && owner.lastName) {
      const fullName = `${owner.firstName} ${owner.lastName}`;
      validOwners.push(fullName);
    }
  }

  if (validOwners.length === 0) {
    return '';
  }

  if (validOwners.length === 1) {
    return validOwners[0];
  } else if (validOwners.length === 2) {
    return `${validOwners[0]} & ${validOwners[1]}`;
  } else {
    // Join all but the last with commas, then add the last with &
    return `${validOwners.slice(0, -1).join(', ')} & ${validOwners[validOwners.length - 1]}`;
  }
}
