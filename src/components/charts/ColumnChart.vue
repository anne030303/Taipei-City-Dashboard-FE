<!-- Developed by Taipei Urban Intelligence Center 2023 -->

<script setup>
import { ref } from "vue";
import { useMapStore } from "../../store/mapStore";

const props = defineProps([
	"chart_config",
	"activeChart",
	"series",
	"map_config",
]);
const mapStore = useMapStore();

const allowMultipleDataPointsSelection = ref(
	(props.chart_config.map_filter?.length === 3 &&
		props.chart_config?.map_filter[2] &&
		props.chart_config?.map_filter?.allowMultipleDataPointsSelection?.includes(
			"ColumnChart"
		)) ||
		false
);

const chartOptions = ref({
	chart: {
		stacked: true,
		toolbar: {
			show: false,
		},
	},
	colors: props.chart_config.color,
	dataLabels: {
		enabled: props.chart_config.categories ? false : true,
		offsetY: 20,
	},
	grid: {
		show: false,
	},
	legend: {
		show: props.chart_config.categories ? true : false,
	},
	plotOptions: {
		bar: {
			borderRadius: 5,
		},
	},
	stroke: {
		colors: ["#282a2c"],
		show: true,
		width: 2,
	},
	tooltip: {
		// The class "chart-tooltip" could be edited in /assets/styles/chartStyles.css
		custom: function ({ series, seriesIndex, dataPointIndex, w }) {
			return (
				'<div class="chart-tooltip">' +
				"<h6>" +
				w.globals.labels[dataPointIndex] +
				`${
					props.chart_config.categories
						? "-" + w.globals.seriesNames[seriesIndex]
						: ""
				}` +
				"</h6>" +
				"<span>" +
				series[seriesIndex][dataPointIndex] +
				` ${props.chart_config.unit}` +
				"</span>" +
				"</div>"
			);
		},
	},
	xaxis: {
		axisBorder: {
			show: false,
		},
		axisTicks: {
			show: false,
		},
		categories: props.chart_config.categories
			? props.chart_config.categories
			: [],
		labels: {
			offsetY: 5,
		},
		type: "category",
	},
	states: {
		active: {
			allowMultipleDataPointsSelection:
				allowMultipleDataPointsSelection.value,
			filter: {
				type: "darken",
				value: 0.5,
			},
		},
	},
});

const selectedIndex = ref(null);

function handleDataSelection(e, chartContext, config) {
	if (!props.chart_config.map_filter) {
		return;
	}
	const toFilter = config.dataPointIndex;
	// 多選
	if (allowMultipleDataPointsSelection.value) {
		const { map_filter } = props.chart_config.map_filter[2];
		const filter_data = [];
		config.selectedDataPoints.forEach((x, y) => {
			x.forEach((xIndex) => {
				filter_data.push([
					map_filter[0].data[y],
					map_filter[1].data[xIndex],
				]);
			});
		});
		mapStore.addLayerMultiFilter(
			`${props.map_config[0].index}-${props.map_config[0].type}`,
			[map_filter[0].name, map_filter[1].name],
			filter_data,
			props.map_config[0]
		);
		// 單選
	} else if (toFilter !== selectedIndex.value) {
		mapStore.addLayerFilter(
			`${props.map_config[0].index}-${props.map_config[0].type}`,
			props.chart_config.map_filter[0],
			props.chart_config.map_filter[1][config.dataPointIndex],
			props.map_config[0]
		);
		selectedIndex.value = toFilter;
	} else {
		mapStore.clearLayerFilter(
			`${props.map_config[0].index}-${props.map_config[0].type}`,
			props.map_config[0]
		);
		selectedIndex.value = null;
	}
}
</script>

<template>
	<div v-if="activeChart === 'ColumnChart'">
		<apexchart
			width="100%"
			height="270px"
			type="bar"
			:options="chartOptions"
			:series="series"
			@dataPointSelection="handleDataSelection"
		></apexchart>
	</div>
</template>
