<!-- Developed by Taipei Urban Intelligence Center 2023 -->

<!-- This component has two modes 'normal mapview charts' / 'basic map layers' -->
<!-- The different modes are controlled by the prop "isMapLayer" (default false) -->

<script setup>
import { ref, computed, watch } from "vue";
import dayjs from "dayjs";
import { useMapStore } from "../../store/mapStore";
import { useDialogStore } from "../../store/dialogStore";

import { chartTypes } from "../../assets/configs/apexcharts/chartTypes";

const mapStore = useMapStore();
const dialogStore = useDialogStore();

const props = defineProps({
	// The complete config (incl. chart data) of a dashboard component will be passed in
	content: { type: Object },
	isMapLayer: { type: Boolean, default: false },
});

// The default active chart is the first one in the list defined in the dashboard component
const activeChart = ref(props.content.chart_config.types[0]);
// Stores whether the component is toggled on or not
const checked = ref(false);
// 讓component可以重新render
const updateTrigger = ref(0);

const animateChart = ref(null);

watch(
	[() => mapStore.currentIndex, () => animateChart.value],
	([currentIndex, animateChartValue]) => {
		if (props.content.index === animateChartValue) {
			console.log(props.content, mapStore.currentIndex);
			if (props.content.index === "stat_pop_nangang") {
				mapStore.setMapLayerSource(
					`${props.content.map_config[0].index}-${props.content.map_config[0].type}-source`
				);
			}
			if (props.content.type === "1-3") {
				mapStore.setAnimatePlot();
			}
		}
	}
);

// Parses time data into display format
const dataTime = computed(() => {
	if (!props.content.time_from) {
		return "固定資料";
	}
	if (!props.content.time_to) {
		return props.content.time_from.slice(0, 10);
	}
	return `${props.content.time_from.slice(
		0,
		10
	)} ~ ${props.content.time_to.slice(0, 10)}`;
});

// If any map layers are loading, disable the toggle
const shouldDisable = computed(() => {
	if (!props.content.map_config) return false;

	const allMapLayerIds = props.content.map_config.map(
		(el) => `${el.index}-${el.type}`
	);

	return (
		mapStore.loadingLayers.filter((el) => allMapLayerIds.includes(el))
			.length > 0
	);
});

// Open and closes the component as well as communicates to the mapStore to turn on and off map layers
function handleToggle() {
	if (!props.content.map_config) {
		if (checked.value) {
			dialogStore.showNotification(
				"info",
				"本組件沒有空間資料，不會渲染地圖"
			);
		}
		return;
	}
	if (checked.value) {
		mapStore.addToMapLayerList(props.content.map_config);
	} else {
		mapStore.turnOffMapLayerVisibility(props.content.map_config);
	}
}
// Toggles between chart types defined in the dashboard component
// Also clear any map filters applied
function changeActiveChart(chartName) {
	activeChart.value = chartName;
	mapStore.clearLayerFilter(
		`${props.content.map_config[0].index}-${props.content.map_config[0].type}`
	);
}

function getMapLayerConfig(index) {
	const mapConfig = props.content.map_config.find(
		(mapLayer) =>
			mapLayer.index === props.content.chart_config.animate.label
	);
	return mapConfig?.property.find((item) => item.key === mapConfig.animate)
		.data[index];
}

function setCurrentIndex(e) {
	animateChart.value = e;
}
</script>

<template>
	<div
		:class="{
			componentmapchart: true,
			checked: checked,
			maplayer: isMapLayer && checked,
		}"
	>
		<div class="componentmapchart-header">
			<div>
				<div>
					<h3>{{ content.name }}</h3>
					<span
						v-if="
							content.chart_config.map_filter &&
							content.map_config
						"
						@click="
							dialogStore.showNotification(
								'info',
								'本組件有篩選地圖功能，點擊圖表資料點以篩選'
							)
						"
						>tune</span
					>
					<span
						v-if="content.map_config"
						@click="
							dialogStore.showNotification(
								'info',
								'本組件有空間資料，點擊開關以顯示地圖'
							)
						"
						>map</span
					>
					<span
						v-if="content.history_data"
						@click="
							dialogStore.showNotification(
								'info',
								'回到儀表板頁面並點擊「組件資訊」以查看'
							)
						"
						>insights</span
					>
				</div>
				<h4 v-if="checked">{{ `${content.source} | ${dataTime}` }}</h4>
			</div>
			<div class="componentmapchart-header-toggle">
				<!-- The class "toggleswitch" could be edited in /assets/styles/toggleswitch.css -->
				<label class="toggleswitch">
					<input
						type="checkbox"
						@change="handleToggle"
						v-model="checked"
						:disabled="shouldDisable"
					/>
					<span class="toggleswitch-slider"></span>
				</label>
			</div>
		</div>
		<div
			class="componentmapchart-control"
			v-if="props.content.chart_config.types.length > 1 && checked"
		>
			<button
				:class="{
					'componentmapchart-control-button': true,
					'componentmapchart-control-active': activeChart === item,
				}"
				v-for="item in props.content.chart_config.types"
				@click="changeActiveChart(item)"
				:key="`${props.content.index}-${item}-mapbutton`"
			>
				{{ chartTypes[item] }}
			</button>
		</div>
		<div
			class="componentmapchart-chart"
			v-if="checked && content.chart_data"
		>
			<!-- 有開啟多選選項才會開啟refresh功能 -->
			<button
				class="refresh"
				v-if="
					content.chart_config.map_filter?.length === 3 &&
					content.chart_config.map_filter[2]?.allowMultipleDataPointsSelection.includes(
						activeChart
					)
				"
				@click="
					content.map_config.forEach((mapLayer) => {
						mapStore.clearLayerFilter(
							`${mapLayer.index}-${mapLayer.type}`,
							mapLayer
						);
					});
					updateTrigger = dayjs().unix();
				"
			>
				<p>Refresh</p>
				<span>refresh</span>
			</button>
			<!-- The components referenced here can be edited in /components/charts -->
			<component
				v-for="item in content.chart_config.types"
				:activeChart="activeChart"
				:is="item"
				:key="`${props.content.index}-${item}-mapchart-${updateTrigger}`"
				:chart_config="content.chart_config"
				:series="content.chart_data"
				:map_config="content.map_config"
				:filterYear="getMapLayerConfig(mapStore.currentIndex)"
			>
			</component>
		</div>
		<div v-else-if="checked" class="componentmapchart-loading">
			<div></div>
		</div>
		<div v-if="checked && !isMapLayer" class="componentmapchart-footer">
			<button @click="dialogStore.showMoreInfo(content)">
				<p>組件資訊</p>
				<span>arrow_circle_right</span>
			</button>
		</div>
		<div
			class="componentmapchart-timebar hide-if-mobile"
			v-if="checked && content.chart_data && content.chart_config.animate"
		>
			<button
				@click="
					mapStore.setMapAnimate(content.index, [
						content.chart_config.animate.min,
						content.chart_config.animate.max,
					]);
					animateChart = content.index;
				"
			>
				<span v-if="mapStore.ifAnimate === content.index"
					>stop_circle</span
				>
				<span v-else>play_circle</span>
				<div>{{ getMapLayerConfig(mapStore.currentIndex) }}</div>
			</button>
			<input
				v-model="mapStore.currentIndex"
				type="range"
				:min="content.chart_config.animate.min"
				:max="content.chart_config.animate.max"
				@input="setCurrentIndex(content.index)"
			/>
		</div>
	</div>
</template>

<style scoped lang="scss">
.componentmapchart {
	width: calc(100% - var(--font-m) * 2);
	max-width: calc(100% - var(--font-m) * 2);
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	position: relative;
	padding: var(--font-m);
	border-radius: 5px;
	background-color: var(--color-component-background);

	&-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;

		h3 {
			font-size: var(--font-m);
		}

		h4 {
			color: var(--color-complement-text);
			font-size: var(--font-s);
			font-weight: 400;
		}

		div:first-child {
			div {
				display: flex;
				align-items: center;
			}

			span {
				margin-left: 8px;
				color: var(--color-complement-text);
				font-family: var(--font-icon);
				user-select: none;
			}
		}

		&-toggle {
			min-height: 1rem;
			min-width: 2rem;
			margin-top: 4px;
		}
	}

	&-control {
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		position: absolute;
		top: 4.2rem;
		left: 0;
		z-index: 8;

		&-button {
			margin: 0 2px;
			padding: 4px 4px;
			border-radius: 5px;
			background-color: rgb(77, 77, 77);
			opacity: 0.6;
			color: var(--color-complement-text);
			font-size: var(--font-s);
			text-align: center;
			transition: color 0.2s, opacity 0.2s;
			user-select: none;

			&:hover {
				opacity: 1;
				color: white;
			}
		}

		&-active {
			background-color: var(--color-complement-text);
			color: white;
		}
	}

	&-chart,
	&-loading {
		margin-top: 20px;
		height: 80%;
		position: relative;
		overflow-y: scroll;

		p {
			color: var(--color-border);
		}
	}
	.refresh {
		position: absolute;
		display: flex;
		align-items: center;
		transition: opacity 0.2s;
		top: 0;
		right: 0;
		z-index: 999;
		&:hover {
			opacity: 0.8;
		}

		@media (max-width: 760px) {
			display: none !important;
		}

		span {
			margin-left: 4px;
			color: var(--color-highlight);
			font-family: var(--font-icon);
			user-select: none;
		}

		p {
			max-height: 1.2rem;
			color: var(--color-highlight);
			user-select: none;
		}
	}

	&-timebar {
		display: flex;
		width: 100%;

		button {
			display: flex;
			align-items: center;

			span {
				color: var(--color-complement-text);
				transition: color 0.2s;
				margin-right: 4px;
				font-family: var(--font-icon);
				font-size: calc(var(--font-m) * var(--font-to-icon));
			}

			div {
				padding-right: 5px;
			}

			&:hover span {
				color: var(--color-highlight);
			}
		}

		input[type="range"] {
			display: flex;
			flex: 1;
			padding: 0;
			border: none;
		}
	}

	&-loading {
		display: flex;
		align-items: center;
		justify-content: center;

		div {
			width: 2rem;
			height: 2rem;
			border-radius: 50%;
			border: solid 4px var(--color-border);
			border-top: solid 4px var(--color-highlight);
			animation: spin 0.7s ease-in-out infinite;
		}
	}

	&-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		overflow: visible;

		button {
			display: flex;
			align-items: center;
			transition: opacity 0.2s;

			&:hover {
				opacity: 0.8;
			}

			@media (max-width: 760px) {
				display: none !important;
			}

			span {
				margin-left: 4px;
				color: var(--color-highlight);
				font-family: var(--font-icon);
				user-select: none;
			}

			p {
				max-height: 1.2rem;
				color: var(--color-highlight);
				user-select: none;
			}
		}
	}
}

.checked {
	max-height: 330px;
	height: 330px;
}

.maplayer {
	height: 200px;
	max-height: 200px;
	padding-bottom: 0;
	.componentmapchart-timebar {
		padding-bottom: var(--font-m);
	}
}
</style>
