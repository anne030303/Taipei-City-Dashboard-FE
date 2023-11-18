<!-- TODO: 將通用的function 移植出去 -->
<!-- TODO: 將上 Dashboard-->

<script setup>
import { ref, computed, watchEffect } from 'vue';
// import mockData from '@/assets/MockData.json';
import CustomTooltip from '../charts/CustomTooltip.vue';
import { determineScaleAndLabels } from '../../assets/utilityFunctions/determineScaleAndLabels';
import {calculateAverage, calculateMedian} from '../../assets/utilityFunctions/determineScaleAndLabels'; 


const props = defineProps([
	"chart_config",
	"activeChart",
	"series",
	"map_config",
]);

// const [activeChart] = props

// console.log('props');

// 定義 X 軸和 Y 軸的標籤值, 邊界值
const xAxisWidth = 60;
const yAxisHeight = 50;

// x, y軸的預留間隔
const safeDistance = 20;

const dataPoints = ref(props.series);
// 老人人口數
const xLabels = computed(() => determineScaleAndLabels(dataPoints.value, 'x'));
// 老房人口數
const yLabels = computed(() => determineScaleAndLabels(dataPoints.value, 'y'));

const maxZ = computed(() => Math.max(...dataPoints.value.map(point => point.z)));
const currentDataPoints = ref([]);
const currentHoverPoint = ref(null);

const averageX = computed(() => calculateAverage(currentDataPoints.value.map(point => point.x)));
const medianX =  computed(() => calculateMedian(currentDataPoints.value.map(point => point.x)));
const averageY = computed(() => calculateAverage(currentDataPoints.value.map(point => point.y)));
const medianY =  computed(() => calculateMedian(currentDataPoints.value.map(point => point.y)));


// 追蹤被點選的Bubble
const activeStatus = ref([]);
const currentHoverPointXLabelBox = ref(null);
const currentHoverPointYLabelBox = ref(null);
const activeCountries = computed(() => {
	if(activeStatus.value.length > 0){
		return activeStatus.value.map(item => item?.country)
	}
	return []
})

// 定義初始年份
const currentYear = ref(1890);
const isPlaying = ref(false);
let intervalId = null;

// 假設 SVG 的尺寸如下
const svgWidth = 900;
const svgHeight = 500;


function scaleX(value) {
	const plotWidth = svgWidth - 2 * (xAxisWidth + safeDistance)
	const labelValues = xLabels.value.labels.map((label) => translateLabelToNum(label));
	const intervalWidth = plotWidth / (labelValues.length - 1);

	for (let i = 0; i < labelValues.length - 1; i++) {
		if (value >= labelValues[i] && value <= labelValues[i + 1]) {
			const relativePosition = (value - labelValues[i]) / (labelValues[i + 1] - labelValues[i]);
			return (i * intervalWidth) + (relativePosition * intervalWidth) + xAxisWidth + safeDistance;
		}
	}
}

function scaleY(value) {    
	// 假設 SVG 高度為 400px，且留有 50px 邊界
	const maxValue =  translateLabelToNum(yLabels.value.labels[yLabels.value.labels.length - 1]);// yLabels 最大值
	const minValue =  translateLabelToNum(yLabels.value.labels[0]);
	const scaledValue = svgHeight - yAxisHeight - safeDistance - ((value - minValue)/ (maxValue - minValue)) * (svgHeight - (yAxisHeight + safeDistance) * 2);
	return scaledValue > svgHeight - yAxisHeight 
		? svgHeight - yAxisHeight 
		: scaledValue < yAxisHeight 
			? yAxisHeight 
			: scaledValue; 
}

function scaleZ(value) {
	// 基於數據點的 z 值定義一個合適的比例來計算半徑
	const maxSize = (maxZ.value); // 假設最大的 z 值
	const maxRadius = 70; // 最大半徑為 40px
	const scaleZ = ((value) / maxSize) * maxRadius;
	return scaleZ < 2 ? 2 : scaleZ; // 轉換為半徑
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

function translateLabelToNum(label){
	if (label.includes('K')) {
		return parseInt(label.replace('K', '')) * 1000;
	} else if (label.includes('M')) {
		return parseInt(label.replace('M', '')) * 1000000;
	} else if (label.includes('B')) {
		return parseInt(label.replace('B', '')) * 1000000000;
	} else {
		return parseInt(label)
	}
}

// x, y軸的 Label是否重疊
function isOverlap(index, axisType) {
	const element1 = document.getElementById(`${axisType === 'x' ? 'xlabel' : 'ylabel'}${index}`);
	const element2 = axisType === 'x' ? currentHoverPointXLabelBox : currentHoverPointYLabelBox;


	if(element1 && element2.value){
		const bbox1 = element1.getBBox();
		const bbox2 = element2.value.getBBox();

		return !(bbox2.x > bbox1.x + bbox1.width + 2
                || bbox2.x + bbox2.width + 2< bbox1.x 
                || bbox2.y > bbox1.y + bbox1.height + 2
                || bbox2.y + bbox2.height + 2< bbox1.y);
	}
}


watchEffect(() => {
	// 計算當前顯示的數據點, currentYear有變動時就重新計算
	currentDataPoints.value = dataPoints.value.filter(point => {
		return (
			activeStatus.value.some(item => item.country === point.country && (item.startYear <= point.year && point.year <= currentYear.value)) ||
        point.year === currentYear.value) &&
        typeof point.x === 'number' &&
        typeof point.y === 'number' &&
        typeof point.z === 'number'
	}
	).map((point, index) => ({
		index: index,
		country: point.country,
		year: point.year,
		x: scaleX(point.x),
		y: scaleY(point.y),
		z: scaleZ(point.z),
		originalX: translateNumToLabel(point.x),
		originalY: translateNumToLabel(point.y),
		originalZ: translateNumToLabel(point.z),
		active: !!point?.active,
		hover: !!point?.hover
	})) || [];
});


watchEffect(() => {
	for (const point of currentDataPoints.value) {
		point.active = activeCountries.value.includes(point.country)
	}
})

watchEffect(() => {
	for (const point of currentDataPoints.value) {
		point.hover = currentHoverPoint.value?.country === point.country && currentHoverPoint.value?.year === point.year
	}
})

// 方法：切換 Bubble 活躍狀態
const toggleBubble = (point) => {

	const countries = activeStatus.value.map(item => item?.country);

	if(countries.includes(point.country)){
		// {country: 'chn', startYear: 1990}
		activeStatus.value = activeStatus.value.filter(item => item.country !== point.country);
	}else{
		activeStatus.value.push({country: point.country, startYear: point.year});
	}

};

// 更新 mouseOverBubble 和 mouseLeaveBubble 方法來使用 reactive 數據點
const mouseOverBubble = (point) => {
	currentHoverPoint.value = {
		...point,
		xLine: { x1: point.x, y1: svgHeight - yAxisHeight, x2: point.x, y2: point.y + point.z }, // Line from bubble to x-axis
		yLine: { x1: xAxisWidth, y1: point.y, x2: point.x - point.z, y2: point.y } // Line from bubble to y-axis
	}
};

const mouseLeaveBubble = () => {
	// point.hover = false; // 當鼠標離開時設定點的 hover 狀態為 false
	currentHoverPoint.value = null
};

// 使用計算屬性來確定 fill 顏色
const getFill = (point) => {
	if (point.hover && !point.active) {
		return 'red';
	}
	return point.active ? 'red' : 'blue';
};

// 計算屬性：根據 Bubble 的活躍狀態計算透明度
const getOpacity = ((point) => {
	return activeCountries.value.length === 0 &&  !currentHoverPoint.value  ? 0.8 : (activeCountries.value.includes(point.country) || currentHoverPoint.value?.country === point.country ?  0.8 : 0.1);
});

// 計算要不要顯示光暈
const isShowHalo = (point) => {
	return point.hover ;
}

// 計算顯示tooltip, 
const isShowTooltip = (point) =>{

	if(point.hover) return true

	if(activeCountries.value.includes(point.country)){
        

		const pointList = currentDataPoints.value.filter(curPoint => curPoint.country === point.country);
        
		if(pointList.length === 1 || pointList.sort((a, b) => a.year - b.year)[0].year === point.year) return true
        
	}
}


// 開始播放
const startPlaying = () => {
	if (!isPlaying.value) {
		isPlaying.value = true;
		intervalId = setInterval(() => {
			const nextYear = currentYear.value + 1;
			const lastYear = Math.max(...dataPoints.value.map(p => p.year));
			if (nextYear > lastYear) {
				stopPlaying(); // 如果超出了数据范围，则停止播放
			} else {
				currentYear.value = nextYear;
			}
		}, 200);
	}
};

// 停止播放
const stopPlaying = () => {
	if (isPlaying.value) {
		clearInterval(intervalId);
		isPlaying.value = false;
	}
};


const callineLengthBetweenTwoBubbles = (point1, point2) => {
	if(point1){
		const x1 = point1.x;
		const x2 = point2.x;
		const y1 = point1.y;
		const y2 = point2.y;
        
		return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
	}
	return 0
}


const isShowConnectLine = (currentDataPoint, currentDataPointIndex) => {
	if(currentDataPoints.value[currentDataPointIndex - 1]){
		const lineLengthBetweenTwoPoints  = callineLengthBetweenTwoBubbles(currentDataPoints.value[currentDataPointIndex + 1], currentDataPoint) 
        
		return (currentDataPoint?.country === currentDataPoints.value[currentDataPointIndex + 1]?.country 
            && lineLengthBetweenTwoPoints > currentDataPoint.z + currentDataPoints.value[currentDataPointIndex + 1]?.z)
	} 
	return false
}

</script>

<template>
	<div v-if="activeChart === 'CustomBubbleChart'" :key="updateTrigger" :id="abc">
		<svg :width="svgWidth" :height="svgHeight">
	<!-- X軸 -->
	<line :x1="xAxisWidth" :y1="svgHeight - yAxisHeight" :x2="svgWidth - xAxisWidth" :y2="svgHeight - yAxisHeight"  stroke="#363e40" />
	<!-- Y軸 -->
	<line :x1="xAxisWidth" :y1="svgHeight - yAxisHeight" :x2="xAxisWidth" :y2="yAxisHeight" stroke="#363e40"/>
	<!-- X軸標籤 -->
	<text :y="svgHeight - 30" text-anchor="middle" v-for="(label, i) in xLabels.labels" :key="'xlabel'+i" :id="'xlabel'+i" :x="xAxisWidth + safeDistance + (i) * (svgWidth - (xAxisWidth + safeDistance) * 2)/(xLabels.labels.length - 1)" :opacity="isOverlap(i, 'x') ? 0 : 1">
		{{ label }}
	</text>
	<!-- Y軸標籤 -->
	<text :x="xAxisWidth - 15" text-anchor="middle" v-for="(label, i) in yLabels.labels" :key="'ylabel'+i" :id="'ylabel'+i" :y="svgHeight - yAxisHeight - safeDistance - ((i) * (svgHeight - (yAxisHeight + safeDistance) * 2)/(yLabels.labels.length - 1)) + 5" :opacity="isOverlap(i, 'y') ? 0 : 1">
		{{ label }}
	</text>
	<!-- 網格線 (X軸) -->
	<g stroke="lightgrey">
		<line v-for="i in (yLabels.labels.length)" :key="'x'+i" :id="'x'+i" :x1="xAxisWidth" :y1="svgHeight - yAxisHeight - safeDistance - (i - 1) * (svgHeight - (yAxisHeight + safeDistance) * 2) / (yLabels.labels.length-1)" :x2="svgWidth - xAxisWidth" :y2="svgHeight - yAxisHeight - safeDistance - (i - 1) * (svgHeight - (yAxisHeight + safeDistance) * 2) / (yLabels.labels.length-1)" stroke="#F1EFEF"/>
	</g>
	<!-- 網格線 (Y軸) -->
	<g stroke="lightgrey" >
		<line v-for="i in (xLabels.labels.length)" :key="'y'+i" :id="'x'+i" :x1="xAxisWidth + safeDistance + (i - 1) * (svgWidth - (xAxisWidth + safeDistance) * 2) / (xLabels.labels.length - 1)" :y1="svgHeight - yAxisHeight" :x2="xAxisWidth + safeDistance + (i - 1) * (svgWidth - (xAxisWidth + safeDistance) * 2) / (xLabels.labels.length - 1)" :y2="yAxisHeight" stroke="#F1EFEF"/>
	</g>
	<!-- 軸標籤 -->
	<text :x="svgWidth / 2" :y="svgHeight - 10" text-anchor="middle">Income</text>
	<text :y="svgHeight / 2 - xAxisWidth" text-anchor="middle" transform="rotate(-90 20,200)">Life expectancy</text>
	<!-- 中央年份 -->
	<text :x="svgWidth / 2" :y="svgHeight / 2" text-anchor="middle" font-size="120" fill="lightgrey" opacity="0.5">{{currentYear}}</text>

	<!-- X 軸平均值線 -->
	<line :x1="averageX" :y1="yAxisHeight" :x2="averageX" :y2="svgHeight - yAxisHeight" stroke="#FF0000" stroke-dasharray="5,5"/>
	<!-- X 軸中位數線 -->
	<line :x1="medianX" :y1="yAxisHeight" :x2="medianX" :y2="svgHeight - yAxisHeight" stroke="#00FF00" stroke-dasharray="5,5"/>

	<!-- Y 軸平均值線 -->
	<line :x1="xAxisWidth" :y1="averageY" :x2="svgWidth - xAxisWidth" :y2="averageY" stroke="#FF0000" stroke-dasharray="5,5"/>
	<!-- Y 軸中位數線 -->
	<line :x1="xAxisWidth" :y1="medianY" :x2="svgWidth - xAxisWidth" :y2="medianY" stroke="#00FF00" stroke-dasharray="5,5"/>

	<!-- 渲染當前年份的數據點 -->
	<g v-show="currentDataPoints.length > 0">
		<!-- 親眼見證key的用處 -->
		<g v-for="(currentDataPoint, currentDataPointIndex) in currentDataPoints" 
			:key="`vzb-bc-bubble-${currentDataPoint.country}-${activeCountries.includes(currentDataPoint.country) ? currentDataPoint.year === currentYear ? '00' : currentDataPoint.year : '00'}`"
			:id="`vzb-bc-bubble-${currentDataPoint.country}-${activeCountries.includes(currentDataPoint.country) ? currentDataPoint.year === currentYear ? '00' : currentDataPoint.year : '00'}`"
		>
			<!-- Bubbles -->
			<circle 
				class="data-point"
				:cx="currentDataPoint.x" :cy="currentDataPoint.y" :r="currentDataPoint.z"
				:fill="getFill(currentDataPoint)"
				:opacity="getOpacity(currentDataPoint)"
				stroke="black"
				:stroke-width="currentDataPoint.active ? 2 : 1"
				@click="toggleBubble(currentDataPoint)" 
				@mouseenter="mouseOverBubble(currentDataPoint)"
				@mouseleave="mouseLeaveBubble()" 
			/>
			<line
				class="vzb-trail-line"
				v-if="isShowConnectLine(currentDataPoint, currentDataPointIndex)"
				:x1="currentDataPoint.x"
				:x2="currentDataPoints[currentDataPointIndex + 1].x"
				:y1="currentDataPoint.y"
				:y2="currentDataPoints[currentDataPointIndex + 1].y"
				:style="{strokeDasharray: `0 
					${currentDataPoints[currentDataPointIndex + 1].z}
					${callineLengthBetweenTwoBubbles(currentDataPoint, currentDataPoints[currentDataPointIndex + 1])} 
					${currentDataPoint.z} `}"   
			>
				<animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="0.5s"/>
			</line>
		</g>
			<!-- Dashed lines for the hovered bubble -->
		<g  v-if="currentHoverPoint">
			<line :x1="currentHoverPoint.xLine.x1" :y1="currentHoverPoint.xLine.y1" :x2="currentHoverPoint.xLine.x2" :y2="currentHoverPoint.xLine.y2" stroke-dasharray="5,5" stroke="black" />
			<line :x1="currentHoverPoint.yLine.x1" :y1="currentHoverPoint.yLine.y1" :x2="currentHoverPoint.yLine.x2" :y2="currentHoverPoint.yLine.y2" stroke-dasharray="5,5" stroke="black" />
			
			<!-- Text for x and y-axis values for the hovered bubble -->
			<text ref="currentHoverPointXLabelBox" :x="currentHoverPoint.x" :y="svgHeight - 30" text-anchor="middle">{{ currentHoverPoint.originalX }}</text>
			<text ref="currentHoverPointYLabelBox" :x="xAxisWidth - 5" :y="currentHoverPoint.y" text-anchor="end">{{ currentHoverPoint.originalY }}</text>
		</g>

		<!-- Tooltip -->
		<g v-for="(currentDataPoint, currentDataPointIndex) in currentDataPoints" :key="'tooltip' + currentDataPointIndex">
			<!-- 光暈效果 -->
			<circle v-show="isShowHalo(currentDataPoint)"
				class="glow data-point"
				:cx="currentDataPoint.x" :cy="currentDataPoint.y" :r="currentDataPoint.z + 6"
				fill="none" stroke="rgb(255, 88, 114)" stroke-width="3" />
			<CustomTooltip
				v-if="isShowTooltip(currentDataPoint)"
				:bubble="currentDataPoint"
				:chart-dimensions="{ width: svgWidth, height: svgHeight,  xAxisWidth, yAxisHeight}"
			/>
		</g>
	</g>
		</svg>
	</div>
</template>

<style scoped>
    .glow {
        filter: blur(2px);
    }

    .data-point {
        transition: cx 0.5s, cy 0.5s, r 0.5s;
    }

    button{
        width: 50px;
        max-height: 30px;
    }

    .vzb-trail-line{
        stroke-width: 2.06321;
        stroke: rgb(0, 152, 223);
        opacity: 0;
        animation: lineAppear 0.5s ease-out 0.01s forwards;
    }

    @keyframes lineAppear {
        to {
            opacity: 1;
        }
    }  
    
</style>