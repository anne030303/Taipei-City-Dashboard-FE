<script setup>
	import DialogContainer from "./DialogContainer.vue";
	import { useDialogStore } from "../../store/dialogStore";

	const dialogStore = useDialogStore();

	function handleClose() {
		dialogStore.hideAllDialogs();
	}

	// const rawHtml = ref(test);
</script>

<template>
	<DialogContainer
	  :dialog="`keplerEmbed`"
	  @on-close="handleClose"
	>
		<!-- <div v-html="rawHtml"></div> -->
		<iframe src="/public/kelper/test.html" style="width: 1000px; height: 700px; border: none;"></iframe>
	</DialogContainer>
  </template>
  

<style scoped lang="scss">
.embed {
	background-color: brown;
	width: 800px;
	height: 600px;
}
</style>