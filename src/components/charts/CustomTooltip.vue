<script setup>
import { computed, ref, onMounted, watch, nextTick } from 'vue';

const props = defineProps({
	bubble: {
		type: Object,
		required: true,
	},
	chartDimensions: {
		type: Object,
		required: true,
	},
});

const tooltipContent = computed(() => {
	if (props.bubble.active) {
		return `${props.bubble.country} ${props.bubble.year}`;
	}
	if (props.bubble.hover) {
		return props.bubble.country;
	}
	return '';
});

const tooltipPosition = computed(() => {
	let x = props.bubble.x - Math.sqrt(props.bubble.z) -  tooltipSize.value.width / 2; 
	let y = props.bubble.y - Math.sqrt(props.bubble.z) -  tooltipSize.value.height / 2; 
	// let y = props.bubble.y - props.bubble.z - tooltipSize.value.height/ 3;

	// 碰到左界做調整
	if(props.chartDimensions.xAxisWidth > x -  tooltipSize.value.width / 2){
		x = props.bubble.x + Math.sqrt(props.bubble.z) +  tooltipSize.value.width / 2; 
	}

	// 碰到上界做調整
	if(props.chartDimensions.yAxisHeight > y - tooltipSize.value.height  / 2){
		y = props.bubble.y + Math.sqrt(props.bubble.z) + tooltipSize.value.height / 2; 
	}

	return { x, y };
});

const tooltipSize = ref({ width: 0, height: 0 });

// 使用ref来引用SVG文本元素
const textElement = ref(null);

onMounted(async () => {
	await nextTick(); // 確保DOM已經更新
	if (textElement.value) {
		// 獲取文本元素的尺寸
		const bbox = textElement.value.getBBox();
		// 根據文本尺寸更新tooltip尺寸，这里添加了一些padding
		tooltipSize.value.width = bbox.width + 2;
		tooltipSize.value.height = bbox.height + 2;
	}
});


watch(tooltipContent, async () => {
	await nextTick(); // 确保DOM已经更新
	if (textElement.value) {
		// 获取文本元素的尺寸
		const bbox = textElement.value.getBBox();
		// 根据文本尺寸更新tooltip尺寸，这里添加了一些padding
		tooltipSize.value.width = bbox.width + 2;
		tooltipSize.value.height = bbox.height + 2;
	}
});



</script>

<template>
    <g :transform="`translate(${tooltipPosition.x},${tooltipPosition.y})`">
        <rect class="vzb-tooltip-border" :width="tooltipSize.width" :height="tooltipSize.height" :x="-tooltipSize.width / 2" :y="-tooltipSize.height / 2" rx="5" ry="5" />
        <text ref="textElement" :x="0" :y="0" class="vzb-bc-label-content" font-size="1.24em">
        {{ tooltipContent }}
        </text>
    </g>
</template>


<style scoped>
.vzb-tooltip-border {
    fill: #fff;
    stroke: #333;
    stroke-width: 1.5px;
    transition: cx 0.5s, cy 0.5s, r 0.5s;
}

.vzb-bc-label-content {
    fill: #333;
    text-anchor: middle;
    alignment-baseline: central;
}
</style>