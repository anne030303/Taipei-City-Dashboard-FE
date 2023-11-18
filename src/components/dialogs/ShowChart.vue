<!-- Developed by Taipei Urban Intelligence Center 2023 -->

<!-- This component only serves a functional purpose if a backend is connected -->
<!-- For static applications, this component could be removed or modified to be a dashboard component overviewer -->

<script setup>
import { ref } from "vue";
import { useDialogStore } from '../../store/dialogStore';

import DialogContainer from './DialogContainer.vue';

const props = defineProps({
	// The complete config (incl. chart data) of a dashboard component will be passed in
	content: { type: Object },
});

// The default active chart is the first one in the list defined in the dashboard component
const activeChart = ref(props.content.chart_config.types[0]);

// console.log(props.content);

const dialogStore = useDialogStore();


function handleClose() {
	dialogStore.hideAllDialogs();
}
</script>

<template>
	<DialogContainer :dialog="`showChart`" @onClose="handleClose">
		<div class="show-chart">
			<div class="show-chart-header">
				<h2 >
					放大圖表
				</h2>
				<button @click="handleClose">取消</button>
			</div>
			<div class="show-chart-container">
				<!-- The components referenced here can be edited in /components/charts -->
				<component
					v-for="item in props.content.chart_config.types"
					:activeChart="activeChart"
					:is="item"
					:chart_config="props.content.chart_config"
					:series="props.content.chart_data"
					:map_config="props.content.map_config"
					:key="`${props.content.index}-${item}-chart`"
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
	height: 800px;
	padding: 10px;

	display: flex;
	flex-direction: column;

	&-header{
		display: flex;
		justify-content: space-between;
		h2 {
			font-size: var(--font-m);
		}
	}

	&-container{
		width: 950px;
		height: 750px;
		margin: 10px auto;
	}
}
</style>