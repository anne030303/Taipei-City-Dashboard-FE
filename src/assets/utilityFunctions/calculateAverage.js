export function calculateAverage(values) {
	const sum = values.reduce((a, b) => a + b, 0);
	return sum / values.length;
}

