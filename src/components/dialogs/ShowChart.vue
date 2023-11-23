<!-- Developed by Taipei Urban Intelligence Center 2023 -->

<!-- This component only serves a functional purpose if a backend is connected -->
<!-- For static applications, this component could be removed or modified to be a dashboard component overviewer -->

<script setup>
import { computed } from "vue";
import { useDialogStore } from "../../store/dialogStore";

import DialogContainer from "./DialogContainer.vue";

const dialogStore = useDialogStore();

// The default active chart is the first one in the list defined in the dashboard component
const activeChart = computed(() => {
	return dialogStore.moreDetailChartContent?.chart_config?.types[0];
});

function handleClose() {
	dialogStore.hideAllDialogs();
}
</script>

<template>
	<DialogContainer :dialog="`showChart`" @onClose="handleClose">
		<div class="show-chart">
			<div class="show-chart-header">
				<h2>放大圖表</h2>
				<button @click="handleClose">取消</button>
			</div>
			<div class="show-chart-container">
				<!-- The components referenced here can be edited in /components/charts -->
				<component
					v-for="item in dialogStore.moreDetailChartContent
						.chart_config.types"
					:activeChart="activeChart"
					:is="item"
					:chart_config="
						dialogStore.moreDetailChartContent.chart_config
					"
					:series="dialogStore.moreDetailChartContent.chart_data"
					:map_config="dialogStore.moreDetailChartContent.map_config"
					:key="`${dialogStore.moreDetailChartContent.index}-${item}-chart`"
					:isDialog="true"
				>
				</component>
			</div>
		</div>
	</DialogContainer>
</template>

<style scoped lang="scss">
.show-chart {
	width: 1000px;
	height: 650px;
	padding: 10px;

	display: flex;
	flex-direction: column;

	&-header {
		display: flex;
		justify-content: space-between;
		h2 {
			font-size: var(--font-m);
		}
	}

	&-container {
		width: 900px;
		height: 600px;
		margin: 10px auto;
	}
}
</style>
