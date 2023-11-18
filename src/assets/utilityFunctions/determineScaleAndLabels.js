// Online Javascript Editor for free
// Write, Edit and Run your Javascript code using JS Online Compiler


export function determineScaleAndLabels(dataPoints, axis, isMapView) {

	// 記得移除
	const values = axis === 'x' ? dataPoints.map(point => point[axis]).filter(value => value <= 256000)
		: dataPoints.map(point => point[axis]).filter(value => value <= 100)

	const max = Math.max(...values);
	const min = Math.min(...values) <= 0 ? 1: Math.min(...values);
    
	const mean = values.reduce((a, b) => a + b, 0) / values.length;
	const standardDeviation = Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / values.length);
	const range = max - min;
	const ratio = max / min;
    
	// 計算 "美觀"的軸
	const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
	const niceMin = Math.floor(min / magnitude) * magnitude;
	const niceMax = Math.ceil(max / magnitude) * magnitude;

	let useMultipleScale = false;
	let MultipleBase = 2;
	let numLabels;

	// 根據比率和標準差來決定是否使用對數尺度
	if (ratio > 1000 || standardDeviation > 0.5 * range) {
		useMultipleScale = true;
		numLabels = Math.min(isMapView ? 8 : 10, Math.ceil(Math.log2((max / (min)))));
	} else {
		numLabels = Math.min(isMapView ? 8 : 10, range); // 如果資料跨度小，標籤數量減少
	}
	// 計算標籤
	let labels = calculateLabels(max, min, niceMin, niceMax, numLabels, useMultipleScale);
	return { scale: useMultipleScale ? 'multiple' : 'linear', labels, MultipleBase };
}
function calculateLabels(max, min, niceMin, niceMax, numLabels, useMultipleScale) {
	let labels = [];

	if (useMultipleScale) {
		// 倍數尺度
		const minlabel = Math.pow(10, Math.ceil(Math.log10(max / (2 ** numLabels))));
		for (let i = 0; i < numLabels; i++) {
			const value = minlabel * 2 ** i;
			labels.push(translateNumToLabel(value));
		}
	} else {
		// 線性尺度
		let interval = (niceMax - niceMin) / numLabels;
		const intervalMagnitude = Math.pow(10, Math.floor(Math.log10(interval)));

		interval = Math.ceil(interval / intervalMagnitude) * intervalMagnitude;
		for (let i = 0; i < numLabels; i++) {
			const value = niceMin + interval * i;
			labels.push(translateNumToLabel(value));
		}
	}
	return labels[0] === '0' ? labels : ['0', ...labels];
}

// 數值轉換
function translateNumToLabel(num){
	if (num < 10000) {
		return num.toString();
	} else if (num < 1000000) {
		return (Math.round(num / 100) / 10).toString().replace('.0', '') + 'K';
	} else if (num < 1000000000) {
		return (Math.round(num / 100000) / 10).toString().replace('.0', '') + 'M';
	} else {
		return (Math.round(num / 100000000) / 10).toString().replace('.0', '') + 'B';
	}
}
