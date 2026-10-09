export function bmi(weight, height) {
  if (!Number.isFinite(weight) || !Number.isFinite(height) || height <= 0) return null;
  return weight / (height / 100) ** 2;
}

export function bmiCategory(value) {
  if (value === null || !Number.isFinite(value)) return null;
  if (value < 18.5) return { index: 0, label: 'Underweight' };
  if (value < 25) return { index: 1, label: 'Normal' };
  if (value < 30) return { index: 2, label: 'Overweight' };
  if (value < 35) return { index: 3, label: 'Obese' };
  if (value < 40) return { index: 4, label: 'Severely obese' };
  return { index: 5, label: 'Morbidly obese' };
}
