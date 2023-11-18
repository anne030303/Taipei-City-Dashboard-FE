<!-- TODO: 將通用的function 移植出去 -->
<!-- TODO: 將上 Dashboard-->
<!-- TODO: 記得把detetminScaleAndLabels 的東西去掉 -->

<script setup>
import { ref, watch, computed, watchEffect, onMounted } from 'vue';
import CustomTooltipForRealChart from './CustomTooltipForRealChart.vue'
import { useRoute } from 'vue-router';
import { determineScaleAndLabels } from '../../assets/utilityFunctions/determineScaleAndLabels2';
// import {calculateAverage} from '../../assets/utilityFunctions/calculateAverage'; 
// import {calculateMedian} from '../../assets/utilityFunctions/calculateMedian'; 


const colorDicForTownName = {
	'中山區': '#66C5CC','中正區': '#F6CF71','信義區':'#F89C74','內湖區': '#DCB0F2','北投區':'#87C55F',
	'南港區': '#9EB9F3', '士林區': '#FE88B1', '大同區': '#C9DB74', '大安區': '#8BE0A4',
	'文山區': '#B497E7', '松山區': '#D3B484', '萬華區': '#B3B3B3'
}

const props = defineProps([
	"chart_config",
	"activeChart",
	"series",
	"map_config",
	"isDialog"
]);

const setting =  {
	dashboard: {
		svgWidth: 420,
		svgHeight: 320,
		xAxisWidth: 50,
		yAxisHeight: 40,
		xAxisWidthSafteDistance: 10,
		yAxisHeightSafteDistance: 75,
		safeDistance: 0,
	},
	mapview: {
		svgWidth: 380,
		svgHeight: 300,
		xAxisWidth: 50,
		yAxisHeight: 40,
		xAxisWidthSafteDistance: 10,
		yAxisHeightSafteDistance: 85,
		safeDistance: 0,
	},
	popoutwindow: {
		svgWidth: 900,
		svgHeight: 600,
		xAxisWidth: 70,
		yAxisHeight: 50,
		xAxisWidthSafteDistance: 15,
		yAxisHeightSafteDistance: -40,
		safeDistance: 0,
	}
}

const layout = ref("dashboard");


const route = useRoute();

const newSettings = computed(() => {
	if(props.isDialog) {
		return setting['popoutwindow']
	}else{
		return setting[layout.value]
	}
}
);

const {svgWidth, svgHeight, xAxisWidth
	,yAxisHeight, xAxisWidthSafteDistance, yAxisHeightSafteDistance, safeDistance} = newSettings.value



watch(route, (newRoute) => {
	if (newRoute.path === '/dashboard') {
		layout.value = 'dashboard';
	} else if(newRoute.path === '/mapview'){
		layout.value = 'mapview';
	} else {
		layout.value = 'popoutwindow'
	}
});

const sortData = (data) => {
	return [...data].sort((a, b) => {
		// If 'x' values are equal, sort by the 'category'
		if (a.category < b.category) return -1;
		if (a.category > b.category) return 1;

		return 0;
	});
}

const dataPoints = ref(sortData(props["series"]));


// year
const xLabels = [2022, 2024, 2026, 2028, 2030, 2032, 2034, 2036, 2038, 2040];
// < 15 人口
const yLabels = computed(() => determineScaleAndLabels(dataPoints.value, 'y', layout));

const currentDataPoints = ref([]);
const currentHoverPoint = ref(null);

// const averageY =  computed(() => calculateAverage(currentDataPoints.value.map(point => point.x)));
// const medianY =  computed(() => calculateMedian(currentDataPoints.value.map(point => point.y)));



// 追蹤被點選的Bubble
const activeStatus = ref([]);
const currentHoverPointXLabelBox = ref(null);
const currentHoverPointYLabelBox = ref(null);
const activeCountries = computed(() => {
	if(activeStatus.value.length > 0){
		return activeStatus.value.map(item => item?.category)
	}
	return []
})	

const containerRef = ref(null);


// 定義初始年份
const currentYear = ref(2022);

function scaleY(value) {
	const plotHeigh = svgHeight - 2 * (yAxisHeight)
	const labelValues = yLabels.value.labels.map((label) => translateLabelToNum(label));
	const intervalHeigh = plotHeigh / (labelValues.length - 1);


	for (let i = 0; i < labelValues.length - 1; i++) {
		if (value >= labelValues[i] && value <= labelValues[i + 1]) {
			const relativePosition = 1 - (value - labelValues[i]) / (labelValues[i + 1] - labelValues[i]);
			return plotHeigh - ((i+1) * intervalHeigh) + (relativePosition * intervalHeigh) + yAxisHeight;
		}
	}
}
function scaleX(value) {    
	const maxValue =  xLabels[xLabels.length - 1];// xLabels 最大值
	const minValue =  xLabels[0];
	const scaledValue = xAxisWidth + ((value - minValue)/ (maxValue - minValue)) * (svgWidth - (xAxisWidth) * 2);
	return scaledValue  >  svgWidth - xAxisWidth? svgWidth - xAxisWidth + 5: scaledValue ; 
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
	currentDataPoints.value = sortData(dataPoints.value.filter(point => {
		return typeof point.x === 'number' &&
        typeof point.y === 'number' &&
		currentYear.value >= point.year
	}
	).map((point, index) => ({
		index: index,
		year: point.year,
		x: scaleX(point.x),
		y: scaleY(point.y),
		z: 2,
		originalX: point.x,
		originalY: translateNumToLabel(point.y),
		active: !!point?.active,
		category: point.category,
		hover: !!point?.hover
	}))) || [];

});


watchEffect(() => {
	for (const point of currentDataPoints.value) {
		point.active = activeCountries.value.includes(point.category)
	}
})

watchEffect(() => {
	for (const point of currentDataPoints.value) {
		point.hover = currentHoverPoint.value?.category === point.category
	}
})



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
	return colorDicForTownName[point.category]
};

// 計算屬性：根據 Bubble 的活躍狀態計算透明度
const getOpacity = (() => {
	return activeCountries.value.length === 0 &&  !currentHoverPoint.value  ? 0.8 : 0.1;
});

// 計算要不要顯示光暈
const isShowHalo = (point) => {
	return point.hover ;
}

// 計算顯示tooltip, 
const isShowTooltip = (point) =>{
	if(point.year === currentYear.value) return true

	return false
}


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

// const isPlaying = ref(false);
// let intervalId = null;


const isShowConnectLine = (currentDataPoint, currentDataPointIndex) => {
	if(currentDataPoints.value[currentDataPointIndex + 1]){
		return (currentDataPoint?.category === currentDataPoints.value[currentDataPointIndex + 1]?.category)

	} 
	return false
}

// const startPlaying = () => {
// 	if (!isPlaying.value) {
// 		isPlaying.value = true;
// 		intervalId = setInterval(() => {
// 			const nextYear = currentYear.value + 1;
// 			const lastYear = Math.max(...dataPoints.value.map(p => p.year));
// 			if (nextYear > lastYear) {
// 				stopPlaying(); // 如果超出了数据范围，则停止播放
// 			} else {
// 				currentYear.value = nextYear;
// 			}
// 		}, 500);
// 	}
// };

// // 停止播放
// const stopPlaying = () => {
// 	if (isPlaying.value) {
// 		clearInterval(intervalId);
// 		isPlaying.value = false;
// 	}
// };

// onMounted(() => {
// 	startPlaying()
// })

</script>

<template>
	<div v-if="activeChart === 'RealTimeChart'" :key="updateTrigger" ref="containerRef">
		
		<svg :width="svgWidth" :height="svgHeight">
			<rect width="100%" height="100%" fill="#333"/>
	<!-- X軸 -->
	<!-- 多出來的5 for 2041年... -->
	<line :x1="xAxisWidth" :y1="svgHeight - yAxisHeight" :x2="svgWidth - xAxisWidth + 5" :y2="svgHeight - yAxisHeight"  stroke="#ccc" />
	<!-- Y軸 -->
	<line :x1="xAxisWidth" :y1="svgHeight - yAxisHeight" :x2="xAxisWidth" :y2="yAxisHeight" stroke="#ccc"/>
	<!-- X軸標籤 -->
	<text :y="svgHeight - 30" text-anchor="middle" v-for="(label, i) in xLabels" :key="'xlabel'+i" :id="'xlabel'+i" :x="xAxisWidth + safeDistance + (i) * (svgWidth - (xAxisWidth + safeDistance) * 2)/(xLabels.length - 1)" :opacity="isOverlap(i, 'x') ? 0 : 1" fill="#fff">
		{{ label }}
	</text>
	<!-- Y軸標籤 -->
	<text :x="xAxisWidth - 15" text-anchor="middle" v-for="(label, i) in yLabels.labels" :key="'ylabel'+i" :id="'ylabel'+i" :y="svgHeight - yAxisHeight - safeDistance - ((i) * (svgHeight - (yAxisHeight + safeDistance) * 2)/(yLabels.labels.length - 1)) + 5" :opacity="isOverlap(i, 'y') ? 0 : 1" fill="#fff">
		{{ label }}
	</text>
	<!-- 網格線 (X軸) -->
	<g stroke="lightgrey">
		<line v-for="i in (yLabels.labels.length)" :key="'x'+i" :id="'x'+i" :x1="xAxisWidth" :y1="svgHeight - yAxisHeight - safeDistance - (i - 1) * (svgHeight - (yAxisHeight + safeDistance) * 2) / (yLabels.labels.length-1)" :x2="svgWidth - xAxisWidth" :y2="svgHeight - yAxisHeight - safeDistance - (i - 1) * (svgHeight - (yAxisHeight + safeDistance) * 2) / (yLabels.labels.length-1)" stroke="#F1EFEF" stroke-width="0.5"/>
	</g>
	<!-- 網格線 (Y軸) -->
	<g stroke="lightgrey" >
		<line v-for="i in (xLabels.length)" :key="'y'+i" :id="'x'+i" :x1="xAxisWidth + safeDistance + (i - 1) * (svgWidth - (xAxisWidth + safeDistance) * 2) / (xLabels.length - 1)" :y1="svgHeight - yAxisHeight" :x2="xAxisWidth + safeDistance + (i - 1) * (svgWidth - (xAxisWidth + safeDistance) * 2) / (xLabels.length - 1)" :y2="yAxisHeight" stroke="#F1EFEF" stroke-width="0.5"/>
	</g>
	<!-- 軸標籤 -->
	<text fill="#fff" :x="svgWidth / 2" :y="svgHeight - xAxisWidthSafteDistance" text-anchor="middle">年份</text>
	<text fill="#fff" :y="svgHeight / 2 - yAxisHeight  + yAxisHeightSafteDistance" :text-anchor="layout !== 'popoutwindow' ? 'start' :'end'" transform="rotate(-90 20,200)">{{'小於15歲人口總數'}}</text>
	<!-- 中央年份 -->
	<text class="central-text" fill="#fff" :x="svgWidth / 2" :y="svgHeight / 1.8" text-anchor="middle" 
	:style="{fontSize: svgWidth < 600 ? '5rem' : '8rem'}"
	opacity="0.5">{{currentYear}}</text>


	<!-- 渲染當前年份的數據點 -->
	<g v-show="currentDataPoints.length > 0">
		<!-- 親眼見證key的用處 -->
		<g v-for="(currentDataPoint, currentDataPointIndex) in currentDataPoints" 
			:key="`vzb-bc-bubble-${currentDataPoint.category}-${currentDataPoint.year}`"
			:id="`vzb-bc-bubble-${currentDataPoint.category}-${activeCountries.includes(currentDataPoint.category) ? currentDataPoint.year === currentYear ? '00' : currentDataPoint.year : '00'}`"
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
				:stroke="getFill(currentDataPoint)"
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
			<text fill="#fff" ref="currentHoverPointXLabelBox" :x="currentHoverPoint.x" :y="svgHeight - 30" text-anchor="middle">{{ currentHoverPoint.originalX }}</text>
			<text fill="#fff" ref="currentHoverPointYLabelBox" :x="xAxisWidth - 5" :y="currentHoverPoint.y" text-anchor="end">{{ currentHoverPoint.originalY }}</text>
		</g>

		<!-- Tooltip -->
		<g v-for="(currentDataPoint, currentDataPointIndex) in currentDataPoints" :key="'tooltip' + currentDataPointIndex">
			<CustomTooltipForRealChart
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

	text{
		font-size: 0.75rem;
	}
	
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
        /* stroke: rgb(0, 152, 223); */
        opacity: 1;
    }

</style>