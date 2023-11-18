export function calculateMedian(values) {
	const sortedValues = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sortedValues.length / 2);
	return sortedValues.length % 2 !== 0 ? sortedValues[mid] : (sortedValues[mid - 1] + sortedValues[mid]) / 2;
}