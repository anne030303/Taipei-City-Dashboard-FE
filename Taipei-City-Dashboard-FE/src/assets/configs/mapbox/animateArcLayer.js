import { ArcLayer } from "@deck.gl/layers";

const defaultProps = {
	coef: { type: "number", value: 0 },
	startState: { type: "boolean", value: true },
};

export default class AnimatedArcLayer extends ArcLayer {
	static layerName = "AnimatedArcLayer";
	static defaultProps = defaultProps;

	getShaders() {
		return Object.assign({}, super.getShaders(), {
			inject: {
				"vs:#decl": `
                    uniform float coef;
                    uniform bool startState;
                `,
				"vs:#main-end": `
                    if (coef > 0.0 && startState == true) {
                        vec4 pct = vec4(segmentRatio);
                        pct.a = step(coef, segmentRatio);
                        // vec4 colorA = instanceSourceColors;
                        vec4 colorA = vec4(vec3(instanceTargetColors),0.5);
                        vec4 colorB = vec4(vec3(instanceTargetColors),0.0);
                        vec4 color = mix(colorA, colorB, pct.a);
                        vColor = color;
                        DECKGL_FILTER_COLOR(vColor, geometry);
                    } else if (coef > 0.0) {
                        vec4 pct = vec4(segmentRatio);
                        vec4 pct2 = vec4(segmentRatio);
                        pct.a = step(coef, segmentRatio);
                        pct2.a = step(coef+0.02, segmentRatio);
                        vec4 colorA = instanceSourceColors;
                        vec4 colorB = vec4(vec3(instanceTargetColors),0.5);
                        vec4 color = pct.a * colorA - pct2.a * colorA + colorB;
                        vColor = color;
                        DECKGL_FILTER_COLOR(vColor, geometry);
                    }
                `,
			},
		});
	}

	draw(opts) {
		this.state.model.setUniforms({
			coef: this.props.coef,
			startState: this.props.startState,
		});
		super.draw(opts);
	}
}
