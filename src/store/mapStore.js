// Cleaned

/* mapStore */
/*
The mapStore controls the map and includes methods to modify it.

!! PLEASE BE SURE TO REFERENCE THE MAPBOX DOCUMENTATION IF ANYTHING IS UNCLEAR !!
https://docs.mapbox.com/mapbox-gl-js/guides/
*/
import { createApp, defineComponent, nextTick, ref } from "vue";
import { defineStore } from "pinia";
import { useAuthStore } from "./authStore";
import { useDialogStore } from "./dialogStore";
import mapboxGl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import axios from "axios";
import { Threebox } from "threebox-plugin";

import mapStyle from "../assets/configs/mapbox/mapStyle.js";
import {
	MapObjectConfig,
	TaipeiTown,
	TaipeiVillage,
	TaipeiBuilding,
	maplayerCommonPaint,
	maplayerCommonLayout,
} from "../assets/configs/mapbox/mapConfig.js";
import { savedLocations } from "../assets/configs/mapbox/savedLocations.js";
import { calculateGradientSteps } from "../assets/configs/mapbox/arcGradient";
import MapPopup from "../components/map/MapPopup.vue";

const { BASE_URL } = import.meta.env;

export const useMapStore = defineStore("map", {
	state: () => ({
		// Array of layer IDs that are in the map
		currentLayers: [],
		// Array of layer IDs that are in the map and currently visible
		currentVisibleLayers: [],
		// Stores all map configs for all layers (to be used to render popups)
		mapConfigs: {},
		// Stores the mapbox map instance
		map: null,
		// 儲存threebox物件
		tb: null,
		// Stores popup information
		popup: null,
		// Stores saved locations
		savedLocations: savedLocations,
		// Store currently loading layers,
		loadingLayers: [],
		// Store Filter Config,
		filterIndex: ["all"],
		ifAutoNavigate: false,
		ifAnimate: null,
		currentIndex: 0,
		currentFieldName: "values_ratio_2022",
		currentMapConfig: null,
		timeRange: [0, 0],
		step: 0,
		startTime: null,
		stackedCircleData: null,
		tubes: {},
	}),
	getters: {},
	actions: {
		/* Initialize Mapbox */
		// 1. Creates the mapbox instance and passes in initial configs
		initializeMapBox() {
			this.map = null;
			this.tb = null;
			const MAPBOXTOKEN = import.meta.env.VITE_MAPBOXTOKEN;
			mapboxGl.accessToken = MAPBOXTOKEN;
			this.map = new mapboxGl.Map({
				...MapObjectConfig,
				style: mapStyle,
			});
			this.map.addControl(new mapboxGl.NavigationControl());
			this.map.doubleClickZoom.disable();
			this.map
				.on("style.load", () => {
					this.initializeBasicLayers();
				})
				.on("click", (event) => {
					if (this.popup) {
						this.popup = null;
					}
					this.addPopup(event);
				})
				.on("idle", () => {
					this.loadingLayers = this.loadingLayers.filter(
						(el) => el !== "rendering"
					);
				});
		},
		// 2. Adds three basic layers to the map (Taipei District, Taipei Village labels, and Taipei 3D Buildings)
		// Due to performance concerns, Taipei 3D Buildings won't be added in the mobile version
		initializeBasicLayers() {
			const authStore = useAuthStore();
			fetch(`${BASE_URL}/mapData/taipei_town.geojson`)
				.then((response) => response.json())
				.then((data) => {
					this.map
						.addSource("taipei_town", {
							type: "geojson",
							data: data,
						})
						.addLayer(TaipeiTown);
				});
			fetch(`${BASE_URL}/mapData/taipei_village.geojson`)
				.then((response) => response.json())
				.then((data) => {
					this.map
						.addSource("taipei_village", {
							type: "geojson",
							data: data,
						})
						.addLayer(TaipeiVillage);
				});
			if (!authStore.isMobileDevice) {
				this.map
					.addSource("taipei_building_3d_source", {
						type: "vector",
						url: import.meta.env.VITE_MAPBOXTILE,
					})
					.addLayer(TaipeiBuilding);
			}

			this.addSymbolSources();
		},
		// 3. Adds symbols that will be used by some map layers
		addSymbolSources() {
			const images = [
				"metro",
				"triangle_green",
				"triangle_white",
				"bike_green",
				"bike_orange",
				"bike_red",
			];
			images.forEach((element) => {
				this.map.loadImage(
					`${BASE_URL}/images/map/${element}.png`,
					(error, image) => {
						if (error) throw error;
						this.map.addImage(element, image);
					}
				);
			});
		},

		/* Adding Map Layers */
		// 1. Passes in the map_config (an Array of Objects) of a component and adds all layers to the map layer list
		addToMapLayerList(map_config) {
			map_config.forEach((element) => {
				let mapLayerId = `${element.index}-${element.type}`;
				// 1-1. If the layer exists, simply turn on the visibility and add it to the visible layers list
				if (
					this.currentLayers.find((element) => element === mapLayerId)
				) {
					this.loadingLayers.push("rendering");
					this.turnOnMapLayerVisibility(mapLayerId);
					if (
						!this.currentVisibleLayers.find(
							(element) => element === mapLayerId
						)
					) {
						this.currentVisibleLayers.push(mapLayerId);
					}
					return;
				}
				let appendLayerId = { ...element };
				appendLayerId.layerId = mapLayerId;
				// 1-2. If the layer doesn't exist, call an API to get the layer data
				this.loadingLayers.push(appendLayerId.layerId);
				if (mapLayerId === "city-3Dcity") {
					this.setCityColor(mapLayerId);
				} else {
					this.fetchLocalGeoJson(appendLayerId);
				}
			});
		},
		// 2. Call an API to get the layer data
		fetchLocalGeoJson(map_config) {
			axios
				.get(`${BASE_URL}/mapData/${map_config.index}.geojson`)
				.then((rs) => {
					this.addMapLayerSource(map_config, rs.data);
				})
				.catch((e) => console.error(e));
		},
		// 3. Add the layer data as a source in mapbox
		addMapLayerSource(map_config, data) {
			if (map_config.type === "arc") {
				this.map.addSource(`${map_config.layerId}-source`, {
					type: "geojson",
					data: { ...data },
				});
				this.AddArcMapLayer(map_config, data);
			} else if (map_config.type === "stacked-circle") {
				const formatData = {
					...data,
					features: data.features.map((feature) => ({
						...feature,
						properties: {
							...feature.properties,
							values_ratio:
								feature.properties[this.currentFieldName],
						},
					})),
				};
				this.map.addSource(`${map_config.layerId}-source`, {
					type: "geojson",
					data: { ...formatData },
				});
				this.addStackedCircleMapLayer(map_config, formatData);
				this.stackedCircleData = data;
			} else {
				if (map_config.animate) {
					this.currentFieldName = "values_2022";
					const formatData = {
						...data,
						features: data.features.map((feature) => ({
							...feature,
							properties: {
								...feature.properties,
								values: feature.properties[
									this.currentFieldName
								],
							},
						})),
					};
					this.map.addSource(`${map_config.layerId}-source`, {
						type: "geojson",
						data: { ...formatData },
					});
				} else {
					this.map.addSource(`${map_config.layerId}-source`, {
						type: "geojson",
						data: { ...data },
					});
				}

				this.addMapLayer(map_config);
			}
		},

		processScaleFeatures(mapLayerId, features, startIndex) {
			const endIndex = Math.min(startIndex + 40, features.length);
			for (let index = startIndex; index < endIndex; index++) {
				const feature = features[index];
				const tb =
					this.tubes[
						`${mapLayerId}-${feature.properties.FULL}-${feature.properties.cat_age_index}`
					];

				// console.log(
				// 	this.currentFieldName,
				// 	feature.properties[this.currentFieldName]
				// );
				tb.set({
					scale: {
						x:
							feature.properties[this.currentFieldName] *
							this.currentMapConfig.paint[
								"stacked-circle-weight"
							],
						y:
							feature.properties[this.currentFieldName] *
							this.currentMapConfig.paint[
								"stacked-circle-weight"
							],
						z: 1,
					},
					duration: 600,
				});
				// window.tb.update();
			}

			if (endIndex < features.length) {
				setTimeout(() => {
					this.processScaleFeatures(mapLayerId, features, endIndex);
				}, 800);

				setTimeout(() => {
					window.tb.update();
					this.map.triggerRepaint();
				}, 1400);
			}
		},

		setMapLayerSource(mapLayerId) {
			const authStore = useAuthStore();
			const fieldName =
				this.currentMapConfig[
					this.currentMapConfig.paint["stacked-circle-radius"] +
						"Prefix"
				] +
				"_" +
				this.currentMapConfig.property.find(
					(item) => item.key === this.currentMapConfig.animate
				).data[this.currentIndex];

			this.currentFieldName = fieldName;

			// this.processScaleFeatures(
			// 	mapLayerId,
			// 	this.stackedCircleData.features,
			// 	0
			// );
			const mapConfig = this.currentMapConfig;
			const _this = this;
			const delay = authStore.isMobileDevice ? 2000 : 500;
			let toRestore = {
				...this.map.getSource(mapLayerId)._data,
			};
			// console.log(this.currentFieldName);

			this.map.removeLayer(mapConfig.layerId);
			const tubesTemp = {};
			this.map.addLayer({
				id: mapConfig.layerId,
				type: "custom",
				renderingMode: "3d",
				onAdd: function () {
					toRestore.features.forEach((feature) => {
						// console.log(feature.properties[_this.currentFieldName]);
						const point1 = [
							...feature.geometry.coordinates,
							mapConfig.paint["stacked-circle-height"] *
								(feature.properties.cat_age_index - 1) +
								mapConfig.paint["stacked-circle-baseHeight"],
						];
						const point2 = [
							...feature.geometry.coordinates,
							mapConfig.paint["stacked-circle-height"] *
								(feature.properties.cat_age_index - 1) +
								mapConfig.paint["stacked-circle-baseHeight"] +
								1,
						];
						let options = {
							geometry: [point1, point2],
							radius:
								feature.properties[_this.currentFieldName] *
								mapConfig.paint["stacked-circle-weight"],
							sides: 32,
							material: "MeshBasicMaterial",
							color: mapConfig.paint["stacked-circle-color"][
								feature.properties.cat_age_index - 1
							],
							anchor: "center",
							opacity: 0.8,
						};

						let tubeMesh = window.tb.tube(options);
						tubeMesh.setCoords(point1);
						tubesTemp[
							`${mapConfig.layerId}-source-${feature.properties.FULL}-${feature.properties.cat_age_index}`
						] = tubeMesh;
						// tubeMesh.set({
						// 	scale: {
						// 		x:
						// 			feature.properties.values_ratio *
						// 			mapConfig.paint["stacked-circle-weight"],
						// 		y:
						// 			feature.properties.values_ratio *
						// 			mapConfig.paint["stacked-circle-weight"],
						// 		z: 1,
						// 	},
						// 	duration: 500,
						// });

						tubeMesh.bbox = true;
						// tubeMesh.tooltip = true;

						window.tb.add(tubeMesh);
					});
				},
				render: function () {
					// tb.toggleLayer(layerId, visible)
					window.tb.update(); //update Threebox scene
				},
			});
			this.tubes = tubesTemp;
			this.currentLayers.push(mapConfig.layerId);
			this.mapConfigs[mapConfig.layerId] = mapConfig;
			this.loadingLayers = this.loadingLayers.filter(
				(el) => el !== mapConfig.layerId
			);
			this.currentVisibleLayers.push(mapConfig.layerId);

			// console.log("clear");
			// window.tb.dispose();

			// this.stackedCircleData.features.forEach((feature, index) => {
			// 	const tb =
			// 		this.tubes[
			// 			`${mapLayerId}-${feature.properties.FULL}-${feature.properties.cat_age_index}`
			// 		];

			// 	tb.set({
			// 		scale: {
			// 			x: feature.properties[this.currentFieldName] * 30,
			// 			y: feature.properties[this.currentFieldName] * 30,
			// 			z: 1,
			// 		},
			// 		duration: 1000,
			// 	});
			// 	// tb.hidden = true;
			// });

			// let count = 0;
			// const render = setInterval(() => {
			window.tb.update();
			this.map.triggerRepaint();
			// 	count++;
			// 	if (count > 100) clearInterval(render);
			// }, 300);
		},
		// 4-1. Using the mapbox source and map config, create a new layer
		// The styles and configs can be edited in /assets/configs/mapbox/mapConfig.js
		addMapLayer(map_config) {
			let extra_paint_configs = {};
			let extra_layout_configs = {};
			if (map_config.icon) {
				extra_paint_configs = {
					...maplayerCommonPaint[
						`${map_config.type}-${map_config.icon}`
					],
				};
				extra_layout_configs = {
					...maplayerCommonLayout[
						`${map_config.type}-${map_config.icon}`
					],
				};
			}
			if (map_config.size) {
				extra_paint_configs = {
					...extra_paint_configs,
					...maplayerCommonPaint[
						`${map_config.type}-${map_config.size}`
					],
				};
				extra_layout_configs = {
					...extra_layout_configs,
					...maplayerCommonLayout[
						`${map_config.type}-${map_config.size}`
					],
				};
			}
			this.loadingLayers.push("rendering");
			this.map.addLayer({
				id: map_config.layerId,
				type: map_config.type,
				paint: {
					...maplayerCommonPaint[`${map_config.type}`],
					...extra_paint_configs,
					...map_config.paint,
				},
				layout: {
					...maplayerCommonLayout[`${map_config.type}`],
					...extra_layout_configs,
				},
				source: `${map_config.layerId}-source`,
			});
			this.currentLayers.push(map_config.layerId);
			this.mapConfigs[map_config.layerId] = map_config;
			this.currentVisibleLayers.push(map_config.layerId);
			this.loadingLayers = this.loadingLayers.filter(
				(el) => el !== map_config.layerId
			);
			if (this.ifAutoNavigate) {
				setTimeout(() => {
					this.easeToLayer(map_config.layerId);
				}, 500);
			}
		},
		// 4-2. Add Map Layer for Arc Maps
		AddArcMapLayer(map_config, data, isFilter = false, isVisible = true) {
			const authStore = useAuthStore();
			const lines = [...JSON.parse(JSON.stringify(data.features))];
			const arcInterval = 20;
			const tb = (window.tb = new Threebox(
				this.map,
				this.map.getCanvas().getContext("webgl"), //get the context from the map canvas
				{ defaultLights: true }
			));
			this.tb = tb;

			if (isVisible) this.loadingLayers.push("rendering");

			for (let i = 0; i < lines.length; i++) {
				let line = [];
				let lngDif =
					lines[i].geometry.coordinates[1][0] -
					lines[i].geometry.coordinates[0][0];
				let lngInterval = lngDif / arcInterval;
				let latDif =
					lines[i].geometry.coordinates[1][1] -
					lines[i].geometry.coordinates[0][1];
				let latInterval = latDif / arcInterval;

				let maxElevation =
					Math.pow(Math.abs(lngDif * latDif), 0.5) * 80000;

				for (let j = 0; j < arcInterval + 1; j++) {
					let waypointElevation =
						Math.sin((Math.PI * j) / arcInterval) * maxElevation;
					line.push([
						lines[i].geometry.coordinates[0][0] + lngInterval * j,
						lines[i].geometry.coordinates[0][1] + latInterval * j,
						waypointElevation,
					]);
				}

				lines[i].geometry.coordinates = [...line];
			}

			const delay = authStore.isMobileDevice ? 2000 : 500;

			setTimeout(() => {
				this.map.addLayer({
					id: map_config.layerId,
					type: "custom",
					renderingMode: "3d",
					onAdd: function () {
						const paintSettings = map_config.paint
							? map_config.paint
							: { "arc-color": ["#ffffff"] };
						const gradientSteps = calculateGradientSteps(
							paintSettings["arc-color"][0],
							paintSettings["arc-color"][1]
								? paintSettings["arc-color"][1]
								: paintSettings["arc-color"][0],
							arcInterval + 1
						);
						for (let line of lines) {
							let lineOptions = {
								geometry: line.geometry.coordinates,
								color: 0xffffff,
								width: paintSettings["arc-width"]
									? paintSettings["arc-width"]
									: 2,
								opacity:
									paintSettings["arc-opacity"] ||
									paintSettings["arc-opacity"] === 0
										? paintSettings["arc-opacity"]
										: 0.5,
							};

							let lineMesh = tb.line(lineOptions);
							lineMesh.geometry.setColors(gradientSteps);
							lineMesh.material.vertexColors = true;

							tb.add(lineMesh);
						}
					},
					render: function () {
						tb.update(); //update Threebox scene
					},
				});
				this.currentLayers.push(map_config.layerId);
				this.mapConfigs[map_config.layerId] = map_config;
				this.loadingLayers = this.loadingLayers.filter(
					(el) => el !== map_config.layerId
				);

				if (!isVisible) {
					tb?.setLayoutProperty(
						map_config.layerId,
						"visibility",
						"none"
					);
				} else {
					this.currentVisibleLayers.push(map_config.layerId);
				}
				if (this.ifAutoNavigate && isFilter) {
					setTimeout(() => {
						this.easeToLayer(map_config.layerId, null, true);
					}, 500);
				}
			}, delay);
		},

		addStackedCircleMapLayer(
			map_config,
			data,
			isFilter = false,
			isVisible = true
		) {
			const authStore = useAuthStore();
			const tb = (window.tb = new Threebox(
				this.map,
				this.map.getCanvas().getContext("webgl"), //get the context from the map canvas
				{
					defaultLights: true,
					enableSelectingFeatures: true,
					enableSelectingObjects: true,
					enableTooltips: true,
					multiLayer: true,
				}
			));
			window.tb.map.repaint = true;

			this.tb = tb;
			if (isVisible) this.loadingLayers.push("rendering");
			this.currentMapConfig = map_config;

			const delay = authStore.isMobileDevice ? 2000 : 500;
			let _this = this;
			setTimeout(() => {
				const tubesTemp = {};
				this.map.addLayer({
					id: map_config.layerId,
					type: "custom",
					renderingMode: "3d",
					onAdd: function () {
						data.features.forEach((feature) => {
							const point1 = [
								...feature.geometry.coordinates,
								map_config.paint["stacked-circle-height"] *
									(feature.properties.cat_age_index - 1) +
									map_config.paint[
										"stacked-circle-baseHeight"
									],
							];
							const point2 = [
								...feature.geometry.coordinates,
								map_config.paint["stacked-circle-height"] *
									(feature.properties.cat_age_index - 1) +
									map_config.paint[
										"stacked-circle-baseHeight"
									] +
									1,
							];
							let options = {
								geometry: [point1, point2],
								radius: 1,
								// parseFloat(
								// 	feature.properties[
								// 		map_config.valueRatioPrefix
								// 	]
								// ) * 30,
								// parseInt(feature.properties.values) /
								// 15,
								sides: 32,
								material: "MeshBasicMaterial",
								color: map_config.paint["stacked-circle-color"][
									feature.properties.cat_age_index - 1
								],
								anchor: "center",
								opacity: 0.8,
							};

							let tubeMesh = tb.tube(options);
							tubeMesh.setCoords(point1);
							tubesTemp[
								`${map_config.layerId}-source-${feature.properties.FULL}-${feature.properties.cat_age_index}`
							] = tubeMesh;
							// lineMesh.geometry.setColors(gradientSteps);
							tubeMesh.set({
								scale: {
									x:
										feature.properties.values_ratio *
										map_config.paint[
											"stacked-circle-weight"
										],
									y:
										feature.properties.values_ratio *
										map_config.paint[
											"stacked-circle-weight"
										],
									z: 1,
								},
								duration: 500,
							});

							// tubeMesh.addEventListener(
							// 	"SelectedChange",
							// 	_this.onSelectedFeatureChange,
							// 	false
							// );

							tubeMesh.addEventListener(
								"SelectedChange",
								_this.onSelectedChange,
								false
							);
							tubeMesh.addEventListener(
								"Wireframed",
								_this.onWireframed,
								false
							);
							tubeMesh.addEventListener(
								"IsPlayingChanged",
								_this.onIsPlayingChanged,
								false
							);
							tubeMesh.addEventListener(
								"ObjectDragged",
								_this.onDraggedObject,
								false
							);
							tubeMesh.addEventListener(
								"ObjectMouseOver",
								_this.onObjectMouseOver,
								false
							);
							tubeMesh.addEventListener(
								"ObjectMouseOut",
								_this.onObjectMouseOut,
								false
							);

							tubeMesh.bbox = true;
							// tubeMesh.tooltip = true;

							tb.add(tubeMesh, "123");
						});
					},
					render: function () {
						// tb.toggleLayer(layerId, visible)
						tb.update(); //update Threebox scene
					},
				});
				this.tubes = tubesTemp;
				this.currentLayers.push(map_config.layerId);
				this.mapConfigs[map_config.layerId] = map_config;
				this.loadingLayers = this.loadingLayers.filter(
					(el) => el !== map_config.layerId
				);

				// this.map.easeTo({
				// 	center: [121.51074515649827, 25.118658575739076],
				// 	zoom: 14.519401462316386,
				// 	duration: 2000,
				// 	pitch: 66.86273534685878,
				// 	bearing: -30.341798474040615,
				// });

				if (!isVisible) {
					tb?.setLayoutProperty(
						map_config.layerId,
						"visibility",
						"none"
					);
				} else {
					this.currentVisibleLayers.push(map_config.layerId);
				}
				if (this.ifAutoNavigate) {
					setTimeout(() => {
						this.easeToLayer(map_config.layerId, null, true);
					}, 500);
				}
			}, delay);
		},
		onSelectedFeatureChange(e) {
			console.log(e);
		},
		onSelectedChange(e) {
			console.log("onSelectedChange", e);
		},
		onWireframed(e) {
			console.log("onWireframed", e);
		},
		onIsPlayingChanged(e) {
			console.log("onIsPlayingChanged", e);
		},
		onDraggedObject(e) {
			console.log("onDraggedObject", e);
		},
		onObjectMouseOver(e) {
			console.log("onObjectMouseOver", e);
		},
		onObjectMouseOut(e) {
			console.log("onObjectMouseOut", e);
		},
		//  5. Turn on the visibility for a exisiting map layer
		turnOnMapLayerVisibility(mapLayerId) {
			console.log(mapLayerId);
			if (mapLayerId === "city-3Dcity") {
				this.setCityColor(mapLayerId);
			} else {
				this.map?.setLayoutProperty(
					mapLayerId,
					"visibility",
					"visible"
				);
				this.tb?.setLayoutProperty(mapLayerId, "visibility", "visible");
				if (this.ifAutoNavigate) {
					setTimeout(() => {
						this.easeToLayer(
							mapLayerId,
							null,
							mapLayerId.slice(-3) === "arc" ||
								mapLayerId.slice(-14) === "stacked-circle"
								? true
								: false
						);
					}, 500);
				}
			}
		},
		// 6. Turn off the visibility of an exisiting map layer but don't remove it completely
		turnOffMapLayerVisibility(map_config) {
			map_config.forEach((element) => {
				let mapLayerId = `${element.index}-${element.type}`;
				if (mapLayerId === "city-3Dcity") {
					this.setCityColor(mapLayerId, false);
				} else {
					this.loadingLayers = this.loadingLayers.filter(
						(el) => el !== mapLayerId
					);

					if (this.map.getLayer(mapLayerId)) {
						this.clearLayerFilter(
							mapLayerId,
							element,
							false,
							false
						);
						if (element.type !== "arc") {
							this.map?.setLayoutProperty(
								mapLayerId,
								"visibility",
								"none"
							);
						}
					}

					this.currentVisibleLayers =
						this.currentVisibleLayers.filter(
							(element) => element !== mapLayerId
						);
				}
			});
			this.removePopup();
		},
		setCityColor(mapLayerId, isOpen = true) {
			if (isOpen) {
				this.map.setPaintProperty(
					"taipei_building_3d",
					"fill-extrusion-color",
					[
						"match",
						["get", "都更機會"],
						"高液化且大於20年",
						"#A25FAD",
						"大於30年",
						"#E06666",
						"已在都更範圍",
						"#F49F36",
						"沒有",
						"#7D7D7D",
						"#7D7D7D",
					]
				);
				this.loadingLayers = this.loadingLayers.filter(
					(el) => el !== mapLayerId
				);
				this.map.easeTo({
					zoom: 15,
					duration: 2000,
				});
			} else {
				this.map.setPaintProperty(
					"taipei_building_3d",
					"fill-extrusion-color",
					[
						"interpolate",
						["linear"],
						["zoom"],
						14.4,
						"#121212",
						14.5,
						"#272727",
					]
				);
			}
		},

		handleAutoNavigate(checked) {
			this.ifAutoNavigate = checked;
			// console.log(this.map.getCenter());
			// console.log(this.map.getZoom());
			// console.log(this.map.getPitch());
			// console.log(this.map.getBearing());
			// console.log(this.map.getStyle().layers);
		},

		/* Popup Related Functions */
		// Adds a popup when the user clicks on a item. The event will be passed in.
		addPopup(event) {
			// Gets the info that is contained in the coordinates that the user clicked on (only visible layers)
			const clickFeatureDatas = this.map.queryRenderedFeatures(
				event.point,
				{
					layers: this.currentVisibleLayers,
				}
			);
			// Return if there is no info in the click
			if (!clickFeatureDatas || clickFeatureDatas.length === 0) {
				return;
			}
			// Parse clickFeatureDatas to get the first 3 unique layer datas, skip over already included layers
			const mapConfigs = [];
			const parsedPopupContent = [];
			let previousParsedLayer = "";

			for (let i = 0; i < clickFeatureDatas.length; i++) {
				if (mapConfigs.length === 3) break;
				if (previousParsedLayer === clickFeatureDatas[i].layer.id)
					continue;
				previousParsedLayer = clickFeatureDatas[i].layer.id;
				mapConfigs.push(this.mapConfigs[clickFeatureDatas[i].layer.id]);
				parsedPopupContent.push(clickFeatureDatas[i]);
			}
			// Create a new mapbox popup
			this.popup = new mapboxGl.Popup()
				.setLngLat(event.lngLat)
				.setHTML('<div id="vue-popup-content"></div>')
				.addTo(this.map);
			// Mount a vue component (MapPopup) to the id "vue-popup-content" and pass in data
			const PopupComponent = defineComponent({
				extends: MapPopup,
				setup() {
					// Only show the data of the topmost layer
					return {
						popupContent: parsedPopupContent,
						mapConfigs: mapConfigs,
						activeTab: ref(0),
					};
				},
			});
			// This helps vue determine the most optimal time to mount the component
			nextTick(() => {
				const app = createApp(PopupComponent);
				app.mount("#vue-popup-content");
			});
		},
		// Remove the current popup
		removePopup() {
			if (this.popup) {
				this.popup.remove();
			}
			this.popup = null;
		},

		/* Functions that change the viewing experience of the map */

		// Add new saved location that users can quickly zoom to
		addNewSavedLocation(name) {
			const coordinates = this.map.getCenter();
			const zoom = this.map.getZoom();
			const pitch = this.map.getPitch();
			const bearing = this.map.getBearing();
			this.savedLocations.push([coordinates, zoom, pitch, bearing, name]);
		},
		// Zoom to a location
		// [[lng, lat], zoom, pitch, bearing, savedLocationName]
		easeToLocation(location_array) {
			this.map.easeTo({
				center: location_array[0],
				zoom: location_array[1],
				duration: 4000,
				pitch: location_array[2],
				bearing: location_array[3],
			});
		},
		easeToLayer(mapLayerId, filter, if3D) {
			const maxBounds = [
				[121.3870596781498, 24.95733863075891], // Southwest coordinates
				[121.6998231749096, 25.21179993640203], // Northeast coordinates
			];
			let bbox = [
				[122, 26],
				[121, 24],
			];
			const targetSource = this.map.getSource(`${mapLayerId}-source`);
			if (targetSource) {
				targetSource._data.features.forEach((feature) => {
					if (
						!filter ||
						filter[1].some((item) => {
							if (filter[0].length === 1) {
								return (
									feature.properties[filter[0][0]] === item[0]
								);
							} else if (filter[0].length === 2) {
								return (
									feature.properties[filter[0][0]] ===
										item[0] &&
									feature.properties[filter[0][1]] === item[1]
								);
							}
						})
					) {
						// 考慮可能會有3D資料
						let dimension;
						if (feature.geometry?.type === "Point") {
							dimension = feature.geometry.coordinates.length;
						} else if (
							feature.geometry?.type === "LineString" ||
							feature.geometry?.type === "MultiPoint"
						) {
							dimension = feature.geometry.coordinates[0].length;
						} else if (
							feature.geometry?.type === "Polygon" ||
							feature.geometry?.type === "MultiLineString"
						) {
							dimension =
								feature.geometry?.coordinates[0][0].length;
						} else if (feature.geometry?.type === "MultiPolygon") {
							dimension =
								feature.geometry.coordinates[0][0][0].length;
						}
						if (dimension) {
							feature.geometry.coordinates
								.flat(Infinity)
								.forEach((xy, index) => {
									if (
										index % dimension === 0 &&
										xy < bbox[0][0] &&
										xy > maxBounds[0][0]
									)
										bbox[0][0] = xy;
									if (
										index % dimension === 0 &&
										xy > bbox[1][0] &&
										xy < maxBounds[1][0]
									)
										bbox[1][0] = xy;
									if (
										index % dimension === 1 &&
										xy < bbox[0][1] &&
										xy > maxBounds[0][1]
									)
										bbox[0][1] = xy;
									if (
										index % dimension === 1 &&
										xy > bbox[1][1] &&
										xy < maxBounds[1][1]
									)
										bbox[1][1] = xy;
								});
						}
					}
				});
				console.log("if3D", if3D);
				this.map.fitBounds(bbox, {
					linear: true,
					duration: 2000,
					padding: { top: 10, bottom: 25, left: 5, right: 5 },
					pitch: if3D ? 60 : 0,
					maxZoom: 16,
				});
			}
		},
		// Remove a saved location
		removeSavedLocation(index) {
			this.savedLocations.splice(index, 1);
		},
		// Force map to resize after sidebar collapses
		resizeMap() {
			if (this.map) {
				setTimeout(() => {
					this.map.resize();
				}, 200);
			}
		},

		/* Map Filtering */
		// Add a filter based on a property on a map layer
		addLayerFilter(layer_id, property, key, map_config) {
			const dialogStore = useDialogStore();

			if (!this.map || dialogStore.dialogs.moreInfo) {
				return;
			}
			if (map_config && map_config.type === "arc") {
				this.map.removeLayer(layer_id);
				let toBeFiltered = {
					...this.map.getSource(`${layer_id}-source`)._data,
				};
				toBeFiltered.features = toBeFiltered.features.filter(
					(el) => el.properties[property] === key
				);
				map_config.layerId = layer_id;
				this.AddArcMapLayer(map_config, toBeFiltered);
				if (this.ifAutoNavigate) {
					setTimeout(() => {
						this.easeToLayer(layer_id, [[property], [[key]]], true);
					}, 500);
				}
				return;
			} else if (map_config && map_config.type === "stacked-circle") {
				this.stackedCircleData.features.forEach((feature) => {
					const tube =
						this.tubes[
							`${map_config.index}-${map_config.type}-source-${feature.properties.FULL}-${feature.properties.cat_age_index}`
						];
					if (feature.properties[property] === key) {
						tube.hidden = false;
					} else {
						tube.hidden = true;
					}
				});
				window.tb.update();
				this.map.triggerRepaint();
				if (this.ifAutoNavigate) {
					setTimeout(() => {
						this.easeToLayer(layer_id, [[property], [[key]]], true);
					}, 500);
				}
				return;
			}
			const filter = ["==", ["get", property], key];
			this.map.setFilter(layer_id, filter);
			if (this.ifAutoNavigate) {
				setTimeout(() => {
					this.easeToLayer(layer_id, [[property], [[key]]]);
				}, 500);
			}
		},
		addLayerMultiFilter(
			layer_id,
			property,
			selectedDataPoints,
			map_config
		) {
			if (!this.map) {
				return;
			}
			this.filterIndex = selectedDataPoints;
			if (map_config && map_config.type === "arc") {
				this.map.removeLayer(layer_id);
				let toBeFiltered = {
					...this.map.getSource(`${layer_id}-source`)._data,
				};
				let filterData = [];
				selectedDataPoints.forEach((item) => {
					filterData = filterData.concat(
						toBeFiltered.features.filter(
							(el) =>
								el.properties[property[0]] === item[0] &&
								el.properties[property[1]] === item[1]
						)
					);
				});
				toBeFiltered.features = [...filterData];
				map_config.layerId = layer_id;
				this.AddArcMapLayer(map_config, toBeFiltered, false);
				if (this.ifAutoNavigate) {
					setTimeout(() => {
						this.easeToLayer(
							layer_id,
							[property, selectedDataPoints],
							true
						);
					}, 500);
				}
				return;
			}
			if (layer_id === "city-3Dcity") {
				if (selectedDataPoints.length === 0) {
					this.clearLayerFilter(layer_id);
				} else {
					const filteItem = [];
					selectedDataPoints.forEach((item) => {
						if (!filteItem.includes(item[1])) {
							filteItem.push(item[1]);
						}
					});
					this.map.setFilter("taipei_building_3d", [
						"in",
						"TOWN_NAME",
						...filteItem,
					]);
				}
			} else {
				const filter = ["in", property, ...selectedDataPoints];
				this.map.setFilter(layer_id, filter);
				if (this.ifAutoNavigate) {
					setTimeout(() => {
						this.easeToLayer(layer_id, [
							[property],
							selectedDataPoints.map((item) => [item]),
						]);
					}, 500);
				}
			}
		},
		// Remove any filters on a map layer
		// ifRestore決定重新建的layer要不要fitbound
		// isVisible決定clear後要不要顯示
		clearLayerFilter(
			layer_id,
			map_config,
			ifRestore = true,
			isVisible = true
		) {
			const dialogStore = useDialogStore();
			if (!this.map || dialogStore.dialogs.moreInfo) {
				return;
			}
			if (map_config && map_config.type === "arc") {
				this.map.removeLayer(layer_id);
				let toRestore = {
					...this.map.getSource(`${layer_id}-source`)._data,
				};
				map_config.layerId = layer_id;
				this.AddArcMapLayer(
					map_config,
					toRestore,
					ifRestore,
					isVisible
				);
				return;
			} else if (map_config && map_config.type === "stacked-circle") {
				this.stackedCircleData.features.forEach((feature) => {
					const tube =
						this.tubes[
							`${map_config.index}-${map_config.type}-source-${feature.properties.FULL}-${feature.properties.cat_age_index}`
						];
					tube.hidden = false;
				});
			}
			if (layer_id === "city-3Dcity") {
				this.map.setFilter("taipei_building_3d", null);
			}
			this.map.setFilter(layer_id, null);
		},

		/* Clearing the map */

		// Called when the user is switching between maps
		clearOnlyLayers() {
			this.currentLayers.forEach((element) => {
				this.map.removeLayer(element);
				this.map.removeSource(`${element}-source`);
			});
			this.currentLayers = [];
			this.mapConfigs = {};
			this.currentVisibleLayers = [];
			this.removePopup();
		},
		// Called when user navigates away from the map
		clearEntireMap() {
			this.currentLayers = [];
			this.mapConfigs = {};
			this.map = null;
			this.currentVisibleLayers = [];
			this.removePopup();
		},
		animate(timestamp) {
			if (this.ifAnimate) {
				if (!this.startTime) this.startTime = timestamp;
				const newStep = parseInt((timestamp - this.startTime) / 1000);
				if (newStep && newStep !== this.step) {
					if (this.currentIndex < this.timeRange[1]) {
						this.currentIndex++;
						requestAnimationFrame(this.animate);
					} else if (this.currentIndex === this.timeRange[1]) {
						setTimeout(() => {
							this.currentIndex = this.timeRange[0];
						}, 1000);
						setTimeout(() => {
							requestAnimationFrame(this.animate);
						}, 2000);
					} else {
						requestAnimationFrame(this.animate);
					}
					this.step = newStep;
				} else {
					requestAnimationFrame(this.animate);
				}
			}
		},
		setMapAnimate(componentId, range) {
			if (this.ifAnimate === componentId) {
				// 當前組件暫停
				this.ifAnimate = null;
				this.step = 0;
				this.startTime = null;
			} else {
				// 切換組件
				if (this.ifAnimate) {
					this.currentIndex = range[0];
					this.step = 0;
					this.startTime = null;
				}
				// 組件播放
				this.ifAnimate = componentId;
				this.timeRange = range;
				this.animate();
			}
		},
		setAnimatePlot(map_configs, layerId, index) {
			map_configs.forEach((map_config) => {
				`${map_config.index}-${map_config.type}`;

				const fieldName =
					"values_" +
					map_config.property.find(
						(item) => item.key === map_config.animate
					).data[index];

				console.log(
					`${map_config.index}-${map_config.type}`,
					fieldName
				);
				this.map.setPaintProperty(
					`${map_config.index}-${map_config.type}`,
					"fill-opacity",
					[
						"interpolate",
						["linear"],
						["get", fieldName],
						0,
						0,
						map_config.index === "hex_pop_mom_horiz" ? 279 : 193,
						0.8,
					]
				);
			});
		},
	},
});
