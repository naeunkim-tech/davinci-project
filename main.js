document.body.style.backgroundColor = "black";

document.addEventListener("DOMContentLoaded", () => {

    /* progress bar */
    // progress start
    const circle1 = document.getElementById("step-1");
    const circle2 = document.getElementById("step-2");
    const circle3 = document.getElementById("step-3");
    let step1procress = new CircleProgress(circle1);
    const step2procress = new CircleProgress(circle2);
    const step3procress = new CircleProgress(circle3);
    step1procress.max = 100;
    step1procress.value = 0;
    step2procress.max = 100;
    step2procress.value = 0;
    step3procress.max = 100;
    step3procress.value = 0;
    // progress end
    function fnStep1() {
        step1procress.value += 20;
    }
    function fnStep2() {
        step2procress.value += 34;
    }
    function fnStep3() {
        step3procress.value += 25;
    }

    /* circle */
    const fragment = /* glsl */ `#version 300 es
    precision highp float;

    #define M_PI 3.1415926535897932384626433832795

    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_time;
    uniform float center_x;
    uniform float center_y;
    uniform float radius;
    uniform float orbit_radius;
    uniform float breath_tempo;
    uniform float orbit_tempo;
    uniform float displacement;
    uniform vec3 color_a;
    uniform vec3 color_b;
    uniform float inner_blur_a;
    uniform float inner_blur_b;
    uniform float outer_blur_a;
    uniform float outer_blur_b;
    out vec4 outColor;

    vec4 blurry_circle(float center_x, float center_y, float radius, float variable_radius, float breath_tempo, float inner_blur, float outer_blur, vec3 base_color);
    vec4 blend(vec4 a, vec4 b);
    vec4 the_circle(float cx, float cy, float r, float displacement, float or, float breath_tempo, float orbit_tempo, vec3 color_a, vec3 color_b, float inner_blur_a, float inner_blur_b, float outer_blur_a, float outer_blur_b);

    void main(){
        outColor = the_circle(center_x, center_y, radius, displacement, orbit_radius, breath_tempo, orbit_tempo, color_a, color_b, inner_blur_a, inner_blur_b, outer_blur_a, outer_blur_b);
    }

    vec4 the_circle(float cx, float cy, float r, float displacement, float or, float breath_tempo, float orbit_tempo, vec3 color_a, vec3 color_b, float inner_blur_a, float inner_blur_b, float outer_blur_a, float outer_blur_b){
        float orbit_x = or * cos(u_time*orbit_tempo);
        float orbit_y = or * sin(u_time*orbit_tempo);
        vec4 pixel_color = blurry_circle(cx+orbit_x, cy+orbit_y, r+orbit_radius, r*0.2, breath_tempo, inner_blur_a*0.3, outer_blur_a*1.1, color_a);
        pixel_color = blend(blurry_circle(cx, cy, r, r*0.2, breath_tempo, inner_blur_a, outer_blur_a, color_a), pixel_color);
        pixel_color = blend(blurry_circle(cx, cy, r+displacement, r*0.2, breath_tempo, inner_blur_b, outer_blur_b, color_b), pixel_color);
        
        return pixel_color;
    }
    vec4 blend(vec4 a, vec4 b){
        return a + b * (1.0 - a.a);
    }
    vec4 blurry_circle(float center_x, float center_y, float radius, float variable_radius, float breath_tempo, float inner_blur, float outer_blur, vec3 base_color){
        float d = min(u_resolution.x, u_resolution.y);
        vec2 st = gl_FragCoord.xy/vec2(d);
        float cx = center_x/d;
        float cy = center_y/d;
        float r = radius/d;
        float vr = variable_radius/d;
        float ib = inner_blur/d;
        float ob = outer_blur/d;
        float pct = 0.0;
        float inner_ratio = M_PI/ib;
        float outer_ratio = M_PI/ob;
        
        float dist = distance(st,vec2(cx, cy));
        
        r += sin(u_time*breath_tempo)*vr/2.;
        float th = (dist-r);
        if(dist<=r){
            th *= inner_ratio;
        }
        else{
            th *= outer_ratio;
        }
        if (th<-M_PI || th>M_PI){
        pct = 0.;
        }else{
        pct = (cos(th)/2.0)+0.5;
        }
        
        vec3 color = base_color*pct;
        
        return vec4(color, pct);
    }
    `;
    const vertex = /* glsl */ `#version 300 es
    in vec4 a_position;

    void main() {
        gl_Position = a_position;
    }
    `;
    class TheCircle {
        constructor(canvas) {
            this._initialize(canvas);
        }
    
        _initialize(canvas) {
            this.canvas = canvas
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            canvas.style.backgroundColor = "black";
            canvas.display = 'block';
            canvas.top = 0;
            canvas.left = 0;
            this.gl = this.canvas.getContext("webgl2");
    
            this._setupShader();
            this._setupEvents();
            this._setupModel();
    
            this.resize();
            this.setCenter(0.5, 0.7);
            this.setRadius(85);
            this.setDisplacement(-5);
            this.setBreathTempo(1);
            this.setOrbitRadius(6);
            this.setOrbitTempo(4);
            this.setColorA([0.70, 0.80, 0.90]);
            this.setBlurA(63, 38);
            this.setColorB([0.90, 0.90, 0.90]);
            this.setBlurB(28, 83);
            this.setBackgroundColor([0.15, 0.35, 0.42], [0.1, 0.22, 0.29], [0.22, 0.34, 0.54]);
            this.audio_bound = false;
            this.audio = null;
        }
    
        _setupShader() {
            const gl = this.gl;
            const program = webglUtils.createProgramFromSources(gl, [vertex, fragment]);
    
            gl.useProgram(program);
    
            this.program = program;
        }
    
        _setupEvents() {
            window.onresize = this.resize.bind(this);
        }
    
        resize() {
            const gl = this.gl;
    
            gl.canvas.width = window.innerWidth;
            gl.canvas.height = window.innerHeight;
            gl.uniform1f(this.centerXLocation, this.centerX*gl.canvas.width);
            gl.uniform1f(this.centerYLocation, this.centerY*gl.canvas.height);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        }
    
        _setupModel() {
            const gl = this.gl;
            const program = this.program;
    
            this.positionAttributeLocation = gl.getAttribLocation(program, "a_position");
            this.resolutionLocation = gl.getUniformLocation(program, "u_resolution");
            this.timeLocation = gl.getUniformLocation(program, "u_time");
            this.centerXLocation = gl.getUniformLocation(program, "center_x");
            this.centerYLocation = gl.getUniformLocation(program, "center_y");
            this.radiusLocation = gl.getUniformLocation(program, "radius");
            this.orbitRadiusLocation = gl.getUniformLocation(program, "orbit_radius");
            this.breathTempoLocation = gl.getUniformLocation(program, "breath_tempo");
            this.orbitTempoLocation = gl.getUniformLocation(program, "orbit_tempo");
            this.colorALocation = gl.getUniformLocation(program, "color_a");
            this.colorBLocation = gl.getUniformLocation(program, "color_b");
            this.innerBlurALocation = gl.getUniformLocation(program, "inner_blur_a");
            this.innerBlurBLocation = gl.getUniformLocation(program, "inner_blur_b");
            this.outerBlurALocation = gl.getUniformLocation(program, "outer_blur_a");
            this.outerBlurBLocation = gl.getUniformLocation(program, "outer_blur_b");
            this.displacementLocation = gl.getUniformLocation(program, "displacement");
    
            const positionBuffer = gl.createBuffer();
    
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                -1, -1, 1, -1, -1,  1,
                -1,  1, 1, -1,  1,  1,
            ]), gl.STATIC_DRAW);
    
            gl.enableVertexAttribArray(this.positionAttributeLocation);
    
            gl.vertexAttribPointer(this.positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        }
    
        bindAudio(audio) {
            this.audio = audio;
            this.audio_bound = true;
            this.audio_context = new (window.AudioContext || window.webkitAudioContext)();
            this.audio_source = this.audio_context.createMediaElementSource(audio);
            this.analyser = this.audio_context.createAnalyser();
            this.audio_source.connect(this.analyser);
            this.analyser.connect(this.audio_context.destination);
            this.analyser.fftSize = 128;
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            this.smooth_variance = 0.0;
        }
    
        setRadius(radius) {
            this.radius = radius/1.0;
            const gl = this.gl;
            gl.uniform1f(this.radiusLocation, this.radius);
        }
    
        setDisplacement(displacement) {
            this.displacement = displacement/1.0;
            const gl = this.gl;
            gl.uniform1f(this.displacementLocation, this.displacement);
        }
    
        setOrbitRadius(orbitRadius) {
            this.orbitRadius = orbitRadius/1.0;
            const gl = this.gl;
            gl.uniform1f(this.orbitRadiusLocation, this.orbitRadius);
        }
    
        setCenter(x, y) {
            this.centerX = x;
            this.centerY = y;
            const gl = this.gl;
            gl.uniform1f(this.centerXLocation, x*gl.canvas.width);
            gl.uniform1f(this.centerYLocation, y*gl.canvas.height);
        }
    
        setBreathTempo(tempo) {
            this.breath_tempo = tempo;
            const gl = this.gl;
            gl.uniform1f(this.breathTempoLocation, tempo);
        }
    
        setOrbitTempo(tempo) {
            this.orbit_tempo = tempo;
            const gl = this.gl;
            gl.uniform1f(this.orbitTempoLocation, tempo);
        }
    
        setColorA(color) {
            this.color_a = color;
            const gl = this.gl;
            gl.uniform3f(this.colorALocation, color[0], color[1], color[2]);
        }
    
        setColorB(color) {
            this.color_b = color;
            const gl = this.gl;
            gl.uniform3f(this.colorBLocation, color[0], color[1], color[2]);
        }
    
        setBlurA(inner, outer) {
            this.blur_a = [inner, outer];
            const gl = this.gl;
            gl.uniform1f(this.innerBlurALocation, inner);
            gl.uniform1f(this.outerBlurALocation, outer);
        }
    
        setBlurB(inner, outer) {
            this.blur_b = [inner, outer];
            const gl = this.gl;
            gl.uniform1f(this.innerBlurBLocation, inner);
            gl.uniform1f(this.outerBlurBLocation, outer);
        }

        setBackgroundColorA(color) {
            this.background_color_a = color;
            const gl = this.gl;
            gl.uniform3f(this.backgroundColorALocation, color[0], color[1], color[2]);
        }
    
        setBackgroundColorB(color) {
            this.background_color_b = color;
            const gl = this.gl;
            gl.uniform3f(this.backgroundColorBLocation, color[0], color[1], color[2]);
        }
        setBackgroundColorC(color) {
            this.background_color_c = color;
            const gl = this.gl;
            gl.uniform3f(this.backgroundColorCLocation, color[0], color[1], color[2]);
        }
    
        setBackgroundColor(colorA, colorB, colorC) {
            this.background_color_a = colorA;
            this.background_color_b = colorB;
            this.background_color_c = colorC;
            const gl = this.gl;
            gl.uniform3f(this.backgroundColorALocation, colorA[0], colorA[1], colorA[2]);
            gl.uniform3f(this.backgroundColorBLocation, colorB[0], colorB[1], colorB[2]);
            gl.uniform3f(this.backgroundColorCLocation, colorC[0], colorC[1], colorC[2]);
        }
    
        sound_interaction() {
            let variance = 0;
            let temp_size;
            if (this.audio_bound && (this.audio.playState === "playing" || this.audio.paused === false)) {
                this.analyser.getByteFrequencyData(this.dataArray);
                variance = Math.max(this.dataArray[2] / 2 - 50, 0);
                this.smooth_variance = this.smooth_variance * 0.9 + variance * 0.1;
            }
            else{
                this.smooth_variance = 0;
            }
            temp_size = this.radius + this.smooth_variance;
            const gl = this.gl;
            gl.uniform1f(this.radiusLocation, temp_size);
        }
    
        render(time) {
            const gl = this.gl;
            time *= 0.001;
    
            gl.uniform2f(this.resolutionLocation, gl.canvas.width, gl.canvas.height);
            gl.uniform1f(this.timeLocation, time);
            if(this.audio_bound){
                this.sound_interaction();
            }
    
            gl.drawArrays(gl.TRIANGLES, 0, 6);
    
            requestAnimationFrame(this.render.bind(this));
        }
    }
    function run() {
        let canvas = document.getElementById("the_circle_canvas")   //HTML의 캔버스 태그를 가져옴
        circle = new TheCircle(canvas);                                   //TheCircle 객체 생성
        circle.render(0);                                            //시작 시 render 함수를 호출하여 캔버스에 그림을 그림
        document.body.scrollTop = 0;
    }
    window.onload = function () {   //페이지 로드시 실행
        run();
    }

    function circleRadius(num) {
        while (setRadiusNum < num) {
            setRadiusNum += 1;
            circle.setRadius(setRadiusNum);
        }
    }


    /* delay */
    function sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }


    var koOpacity = 0; enOpacity = 0; inputOpacity = 0; circleOpacity = 0;
    var textintervalID = 0; inputintervalID = 0; circleintervalID = 0;
    function textFadeOut(){
		var ko = document.getElementById("ko");
        var en = document.getElementById("en");
		koOpacity = Number(window.getComputedStyle(ko).getPropertyValue("opacity"));
        enOpacity = Number(window.getComputedStyle(en).getPropertyValue("opacity"));
		if(koOpacity > 0){
			koOpacity = koOpacity - 0.1;
			ko.style.opacity = koOpacity;
		}
		else{
			clearInterval(textintervalID);
		}
        if(enOpacity > 0){
			enOpacity = enOpacity - 0.1;
			en.style.opacity = enOpacity;
		}
		else{
			clearInterval(textintervalID);
		}
	}
    function textFadeIN(){
        var ko = document.getElementById("ko");
        var en = document.getElementById("en");
		koOpacity = Number(window.getComputedStyle(ko).getPropertyValue("opacity"));
        enOpacity = Number(window.getComputedStyle(en).getPropertyValue("opacity"));
		if(koOpacity < 1){
			koOpacity = koOpacity + 0.1;
			ko.style.opacity = koOpacity;
		}
		else{
			clearInterval(textintervalID);
		}
        if(enOpacity < 1){
			enOpacity = enOpacity + 0.1;
			en.style.opacity = enOpacity;
		}
		else{
			clearInterval(textintervalID);
		}
    }
    function inputFadeOut(){
		inputOpacity = Number(window.getComputedStyle(document.getElementById("input")).getPropertyValue("opacity"));
		if(inputOpacity > 0){
			inputOpacity = inputOpacity - 0.1;
			document.getElementById("input").style.opacity = inputOpacity;
		}
		else{
			clearInterval(inputintervalID);
		}
	}
    function inputFadeIN(){
		inputOpacity = Number(window.getComputedStyle(document.getElementById("input")).getPropertyValue("opacity"));
		if(inputOpacity < 1){
			inputOpacity = inputOpacity + 0.1;
			document.getElementById("input").style.opacity = inputOpacity;
		}
		else{
			clearInterval(inputintervalID);
		}
    }
    function circleFadeIn() {
        circleOpacity = Number(window.getComputedStyle(document.getElementById("the_circle_canvas")).getPropertyValue("opacity"));
		if(circleOpacity < 1){
			circleOpacity = circleOpacity + 0.1;
			document.getElementById("the_circle_canvas").style.opacity = circleOpacity;
		}
		else{
			clearInterval(circleintervalID);
		}
    }
    function circleFadeOut(){
		circleOpacity = Number(window.getComputedStyle(document.getElementById("the_circle_canvas")).getPropertyValue("opacity"));
		if(circleOpacity > 0){
			circleOpacity = circleOpacity - 0.1;
			document.getElementById("the_circle_canvas").style.opacity = circleOpacity;
		}
		else{
			clearInterval(circleintervalID);
		}
	}


    /* 답변 분석 dic, variable */
    var numberDic = {
        0: ['없', '영', 'none', 'nothing', 'don\'t', 'dont', 'not'],
        1: ['한', '하나', 'one'],
        2: ['두', '둘', 'two', '세', '셋', 'three', '네', '넷', 'four', '다섯', 'five', '여섯', 'six', '일곱', 'seven', '여덟', 'eight', '아홉', 'nine'],
        3: ['열', '십', 'ten', 'eleven', 'twelve'],
        4: ['스물', '스무', '이십', 'twenty'],
        5: ['서른', '삼십', 'thirty'],
        6: ['마흔', '사십', 'forty'],
        7: ['쉰', '오십', 'fifty'],
        8: ['예순', '육십', 'sixty'],
        9: ['일흔', '칠십', 'seventy'],
        10: ['여든', '팔십', 'eighty'],
        11: ['아흔', '구십', 'ninety'],
        12: ['많', '모든', 'many', 'countless', 'numberless', 'every', 'all']
    }
    var yesOrNoDic = {
        0: ['아니', '아뇨', '안', 'ㄴ', '없', 'no', 'never', 'nothing', 'don\'t', 'dont', 'not'],
        1: ['글쎄', '몰', '모르', '아마', 'maybe'],
        2: ['네', '예', '응', '어', '있', 'ㅇ', 'yes']
    }
    // fist classification
    let gender = -1; age = -1; degree = -1; marriage = -1; region = -1;  // Lv1
    let love = -1; hate = -1; weather = -1; important = -1; friend = -1; // Lv2
    let percent = -1; percentStr = -1; secret = -1; accuracy = -1;   // Lv3
    // second classification : score
    let genderScore = 0; ageScore = 0; degreeScore = 0; regionScore = 0; marriageScore = 0;    // Lv1
    let loveScore = 0; hateScore = 0; weatherScore = 0; importantScore = 0; friendScore = 0;    // Lv2
    let percentScore = 0; secretScore = 0;  // Lv3
    

    /* 답변 처리 함수 */    
    // Q1에 대한 input 받아 questionSeq = 1, Lv1_Q1()가 input 처리 시작
    // Lv1_Q1. What gender do you identify as?
    function Lv1_Q1(input) {
        // progress bar
        fnStep1();
        // data processing
        var genderDic = {
            0: ['여', '여자', '여성', 'female', 'woman', 'girl', 'she', 'her'],
            1: ['남', '남자', '남성', 'male', 'man', 'boy', 'he', 'him'],
            2: [] // contains case of 'prefer not to say'
        }
        for (let i = 0; i < Object.keys(genderDic).length; i++) {
            for (let j = 0; j < genderDic[i].length; j++) {
                if ((input.toLowerCase()).indexOf(genderDic[i][j]) !== -1) {
                    gender = i;
                }
            }
            // 'female', 'woman'은 'male', 'man'을 포함하므로 gender 값 정해진 즉시 반복문 탈출
            if (gender > -1) {
                break;
            }
        }
        if (gender == -1) {
            gender = 2;
        }
        // second classification : score
        if (gender < 2) {
            genderScore = 1;
        } else {
            genderScore = 2;
        }
        return $.ajax({
            type:'POST',
            url: '/gender',
            accept: "application/json",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ data: input}),
        }).done(function(data){
            document.getElementById("ko").innerText = "당신의 나이는 무엇입니까?";  // questionSeq = 1
            document.getElementById("en").innerText = "What is your age?";
            return genderScore;
        });
    }
    // Q2에 대한 input 받아 questionSeq = 2, Lv1_Q2()가 input 처리 시작
    // Lv1_Q2. What is your age?
    function Lv1_Q2(input) {
        // progress bar
        fnStep1();
        // data processing
        var ageDic = {
            0: ['한', '하나', 'one', '두', '둘', 'two', '세', '셋', 'three', '네', '넷', 'four', '다섯', 'five', '여섯', 'six', '일곱', 'seven', '여덟', 'eight', '아홉', 'nine'], // under teens, contains 0-9
            1: ['열', '십', 'ten', 'eleven', 'twelve', 'teen'], // teens, contains 10-19
            2: ['스물', '스무', '이십', '약관', 'twenty', 'twenties'], // twenties, contains 20-29
            3: ['서른', '삼십', 'thirty', 'thirties'], // thirties, contains 30-39
            4: ['마흔', '사십', '불혹', 'forty', 'forties'], // forties, contains 40-49
            5: ['쉰', '오십', 'fifty', 'fifties'], // fifties, contains 50-59
            6: ['예순', '육십', '환갑', 'sixty', 'sixties'],    // sixties, contains 60-69
            7: ['일흔', '칠십', 'seventy', 'seventies'],    // seventies, contains 70-79
            8: ['여든', '팔십', 'eighty', 'eighties'],    // eighties, contains 80-89
            9: ['아흔', '구십', 'ninety', 'nineties'],    // nineties, contains 90-99
            10: ['서른마흔다섯', '백', '천', '억'] // contains case of 'prefer not to say'
        }
        // if (typeof output) -> string
        if (isNaN(parseInt(input))) {
            // 십의 자리만 판별, 따라서 90대부터 10대까지 내림차순 확인
            for (let i = Object.keys(ageDic).length - 1; i > 0; i--) {
                for (let j = 0; j < ageDic[i].length; j++) {
                    if ((input.toLowerCase()).indexOf(ageDic[i][j]) !== -1) {
                        age = i;
                    }
                }
                // 두 자리 수일 경우, 일의 자리 수는 판별하지 않는다.
                if (age > -1) {
                    break;
                }
            }
        } 
        // if (typeof output) -> number / number + string
        else {
            if (parseInt(parseInt(input)/10) < 10) {
                age = parseInt(parseInt(input)/10);
            } else {
                age = 10;
            }
        }
        // second classification : score
        if (age < 3) {
            ageScore = 0;
        } else {
            ageScore = 1;
        }
        return $.ajax({
            type:'POST',
            url: '/age',
            accept: "application/json",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ data: input}),
        }).done(function(data){
            document.getElementById("ko").innerText = "집은 어디에 있습니까?";  // questionSeq = 2
            document.getElementById("en").innerText = "Where is your home located?";
            return ageScore;
        });
    }
    // input 받아 questionSeq = 3, Lv1_Q3() 시작
    // Lv1_Q3. Where is your home located?
    function Lv1_Q3(input) {
        // progress bar
        fnStep1();
        // data processing
        var regionDic = {
            0: ['서울', 'seoul'],
            1: ['부산', 'busan', '대구', , 'daegu', '인천', 'incheon', '광주', 'gwangju', '대전', 'daejeon', '울산', 'ulsan', '세종', 'sejong', '광역'],
            2: ['경기', '강원', '충청', '전라', '경상', '황해', '평안', '함경'],
            3: ['제주', 'jeju'],
            4: [] // contains case of 'prefer not to say', 'foreign'
        }
        for (let i = 0; i < Object.keys(regionDic).length; i++) {
            for (let j = 0; j < regionDic[i].length; j++) {
                if ((input.toLowerCase()).indexOf(regionDic[i][j]) !== -1) {
                    region = i;
                }
            }
        }
        if (region == -1) {
            region = 4;
        }
        if (region == 0) {
            regionScore = 0;
        } else if (region == 1) {
            regionScore == 0.5;
        } else if (region == 2 || region == 4) {
            regionScore = 1;
        } else if (region == 3) {
            regionScore = 1.5;
        }
        return $.ajax({
            type:'POST',
            url: '/home',
            accept: "application/json",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ data: input}),
        }).done(function(data){
            document.getElementById("ko").innerText = "당신이 완료한 가장 높은 교육 수준은 무엇입니까?";  // questionSeq = 3
            document.getElementById("en").innerText = "What is the highest degree or level of education you have completed?";
            return regionScore;
        });
    }
    // input 받아 questionSeq = 4, Lv1_Q4() 시작
    // Lv1_Q4. What is the highest degree or level of education you have completed?
    function Lv1_Q4(input) {
        // progress bar
        fnStep1();
        // data processing
        var degreeDic = {
            0: ['유치원', 'kindergarten', 'preschool', 'nursery'],
            1: ['초등', '초딩', '초졸', 'elementary', 'primary'],
            2: ['중학', '중딩', '중졸', 'middle', 'secondary'],
            3: ['고등', '고딩', '고졸', '실업계', 'high'],
            4: ['대학', '대딩', '대졸', '학사', 'bachelor'],
            5: ['대학원', '석사', 'master'],
            6: ['박사', 'ph'],
            7: [] // contains case of 'prefer not to say'
        }
        for (let i = 0; i < Object.keys(degreeDic).length; i++) {
            for (let j = 0; j < degreeDic[i].length; j++) {
                if ((input.toLowerCase()).indexOf(degreeDic[i][j]) !== -1) {
                    degree = i;
                }
            }
            // '자퇴', '중퇴', 'quit', 'drop', 'left' 포함 시 한 단계 아래 학력으로 간주
            if (degree > -1) {
                if ((input.toLowerCase()).indexOf('자퇴') !== -1
                || (input.toLowerCase()).indexOf('중퇴') !== -1
                || (input.toLowerCase()).indexOf('quit') !== -1
                || (input.toLowerCase()).indexOf('drop') !== -1
                || (input.toLowerCase()).indexOf('left') !== -1) {
                    // '유치원 자퇴' 등의 표현은 제외
                    if ((degree - 1) > -1) {
                        degree -= 1;
                        break;
                    }
                }
            }
        }
        if (degree == -1) {
            degree = 7;
        }
        // second classification : score
        if (degree < 3 || degree > 5) {
            degreeScore = 1;
        } else if (degree == 3 || degree == 5) {
            degreeScore = 0.5;
        } else {
            degreeScore = 0;
        }
        return $.ajax({
            type:'POST',
            url: '/degree',
            accept: "application/json",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ data: input}),
        }).done(function(data){
            document.getElementById("ko").innerText = "결혼했습니까?";  // questionSeq = 4
            document.getElementById("en").innerText = "Are you married?";
            return degreeScore;
        });
    }
    // input 받아 questionSeq = 5, Lv1_Q5() 시작
    // Lv1_Q5. Are you married?
    function Lv1_Q5(input) {
        // progress bar
        fnStep1();
        // data processing
        var marriageDic = {
            0: ['네', '예', '응', '어', 'ㅇ', '했', '기혼', '약혼', '있', 'yes', 'engage'],
            1: ['아니', '아뇨', '안', 'ㄴ', '미혼', '없', '혼자', '독신', 'no'],
            2: ['여러', '다녀', '었', '이혼', '사별', 'divorce', 'gone', 'death', 'die', 'bereave', 'lose'],
            3: [] // contains case of 'prefer not to say'
        }
        for (let i = 0; i < Object.keys(marriageDic).length; i++) {
            for (let j = 0; j < marriageDic[i].length; j++) {
                if ((input.toLowerCase()).indexOf(marriageDic[i][j]) !== -1) {
                    marriage = i;
                }
            }
        }
        if (marriage == -1) {
            marriage = 3;
        }
        // second classification : score
        if (marriage > 1) {
            marriageScore = 2; 
        } else {
            marriageScore = 1;
        }
        return $.ajax({
            type:'POST',
            url: '/marriage',
            accept: "application/json",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ data: input}),
        }).done(function(data){
            return marriageScore;
        });
    }
    
    // input 받아 questionSeq = 6~8, Lv2_Q1() 시작
    // Lv2_Q1. 당신이 이 세상에서 사랑한다고 말할 수 있는 것은 몇 개나 되나요?
    function Lv2_Q1(input) {
        // progress bar
        fnStep2();
        // data processing
        // if (typeof output) -> string
        if (isNaN(parseInt(input))) {
            // 십의 자리만 판별, 따라서 90부터 10까지 내림차순 확인
            for (let i = Object.keys(numberDic).length - 1; i > 0; i--) {
                for (let j = 0; j < numberDic[i].length; j++) {
                    if ((input.toLowerCase()).indexOf(numberDic[i][j]) !== -1) {
                        love = i;
                    }
                }
                // 두 자리 수일 경우, 일의 자리 수는 판별하지 않는다.
                if (love > -1) {
                    break;
                }
            }
            if (love == -1) {
                love = 12;
            }
        } 
        // if (typeof output) -> number / number + string
        else {
            if (parseInt(parseInt(input)/10) < 10) {
                if (parseInt(parseInt(input)/10) > 0) {
                    // 두 자리 수일 경우, numberDic 구조에 따라 숫자/10 + 2 = 숫자가 속한 numberDic의 key
                    love = parseInt(parseInt(input)/10) + 2;
                } else {
                    // 한 자리 수일 경우, '1'과 '1 이상' 두 가지로 분류
                    if (parseInt(input) > 1) {
                        love = 2;
                    } else {
                        love = parseInt(input);
                    }
                }
            } else {
                love = 12;
            }
        }
        // second classification : score
        if (love < 12) {
            // 개수: 0
            if (love == 0) {
                loveScore = 2;
            // 개수: 1
            } else if (love == 1) {
                loveScore = 1.5;
            // 개수: 2~9
            } else if (love == 2) {
                loveScore = 1;
            // 개수: 10~99
            } else {
                loveScore == 0.5;
            }
        } else {
            // 개수 : 100개 이상 (contains case of 'prefer not to say', etc.)
            loveScore = 0;
        }
        return $.ajax({
            type:'POST',
            url: '/love',
            accept: "application/json",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ data: input}),
        }).done(function(data){
            return loveScore;
        });
    }
    // input 받아 questionSeq = 6~8, Lv2_Q2() 시작
    // Lv2_Q2. 당신이 이 세상에서 증오한다고 말할 수 있는 것은 몇 개나 되나요?
    function Lv2_Q2(input) {
        // progress bar
        fnStep2();
        // data processing
        // if (typeof output) -> string
        if (isNaN(parseInt(input))) {
            // 십의 자리만 판별, 따라서 90부터 10까지 내림차순 확인
            for (let i = Object.keys(numberDic).length - 1; i > 0; i--) {
                for (let j = 0; j < numberDic[i].length; j++) {
                    if ((input.toLowerCase()).indexOf(numberDic[i][j]) !== -1) {
                        hate = i;
                    }
                }
                // 두 자리 수일 경우, 일의 자리 수는 판별하지 않는다.
                if (hate > -1) {
                    break;
                }
            }
            if (hate == -1) {
                hate = 0;
            }
        } 
        // if (typeof output) -> number / number + string
        else {
            if (parseInt(parseInt(input)/10) < 10) {
                if (parseInt(parseInt(input)/10) > 0) {
                    // 두 자리 수일 경우, numberDic 구조에 따라 숫자/10 + 2 = 숫자가 속한 numberDic의 key
                    hate = parseInt(parseInt(input)/10) + 2;
                } else {
                    // 한 자리 수일 경우, '1'과 '1 이상' 두 가지로 분류
                    if (parseInt(input) > 1) {
                        hate = 2;
                    } else {
                        hate = parseInt(input);
                    }
                }
            } else {
                hate = 0;
            }
        }
        // second classification : score
        if (hate < 12) {
            // 개수: 0
            if (hate == 0) {
                hateScore = 0;
            // 개수: 1
            } else if (hate == 1) {
                hateScore = 0.5;
            // 개수: 2~9
            } else if (hate == 2) {
                hateScore = 1;
            // 개수: 10~99
            } else {
                hateScore == 1.5;
            }
        } else {
            // 개수 : 100개 이상 (contains case of 'prefer not to say', etc.)
            hateScore = 2;
        }
        return $.ajax({
            type:'POST',
            url: '/hate',
            accept: "application/json",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ data: input}),
        }).done(function(data){
            return hateScore;
        });
    }
    // input 받아 questionSeq = 6~8, Lv2_Q3() 시작
    // Lv2_Q3. 당신은 어떤 계절을 좋아하나요?
    function Lv2_Q3(input) {
        // progress bar
        fnStep2();
        // data processing
        var weatherDic = {
            0: ['다', '모든', 'all', 'every'], // contains case of 'prefer not to say'
            1: ['봄', 'spring'],
            2: ['여름', 'summer'],
            3: ['가을', 'autumn', 'fall'],
            4: ['겨울', 'winter'],
            5: ['싫', '없', '몰', '모르', '안', '글쎄', 'none', 'nothing', 'don\'t', 'dont', 'not']
        }
        for (let i = Object.keys(weatherDic).length - 1; i > 0; i--) {
            for (let j = Object.keys(weatherDic).length; j < weatherDic[i].length; j++) {
                if ((input.toLowerCase()).indexOf(weatherDic[i][j]) !== -1) {
                    weather = i;
                }
            }
        }
        if (weather == -1) {
            weather = 0;
        }
        // second classification : score
        if (weather < 2) {
            weatherScore = 0;
        } else if (weather == 2){
            weatherScore = 0.5;
        } else if (weather == 3) {
            weatherScore = 1;
        } else if (weather == 4) {
            weatherScore = 1.5;
        } else {
            weatherScore = 2;
        }
        return $.ajax({
            type:'POST',
            url: '/season',
            accept: "application/json",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ data: input}),
        }).done(function(data){
            return weatherScore;
        });
    }
    // input 받아 questionSeq = 6~8, Lv2_Q4() 시작
    // Lv2_Q4. 인생에서 가장 중요하게 생각하는 것은 무엇인가요?
    function Lv2_Q4(input) {
        // progress bar
        fnStep2();
        // data processing
        var importantDic = {
            0: ['가족', '친구', '사람', 'family', 'friend', 'human'],
            1: ['사랑', 'love', '우정', 'friendship', '행복', 'happy', 'happiness', '여유', 'relax', '평온', 'peace', '열정', 'passion'],
            2: ['윤리', 'ethic', '도덕', 'moral', '양심', 'conscience', '이성', 'reason'],
            3: ['돈', '물질', '경제', 'money', 'material', 'afford'],
            4: ['없', '몰', '모르', '안', '글쎄', 'none', 'nothing', 'don\'t', 'dont', 'not']    // contains case of 'prefer not to say'
        }
        for (let i = 0; i < Object.keys(importantDic).length; i++) {
            for (let j = 0; j < importantDic[i].length; j++) {
                if ((input.toLowerCase()).indexOf(importantDic[i][j]) !== -1) {
                    important = i;
                }
            }
        }
        // second classification : score
        if (important < 1) {
            importantScore = 0;
        } else if (important == 1) {
            importantScore = 0.5;
        } else if (important == 2) {
            importantScore = 1;
        } else if (important == 3) {
            importantScore = 1.5;
        } else if (important = 4) {
            importantScore = 2;
        }
        return $.ajax({
            type:'POST',
            url: '/important',
            accept: "application/json",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ data: input}),
        }).done(function(data){
            return importantScore;
        });
    }
    // input 받아 questionSeq = 6~8, Lv2_Q5() 시작
    // Lv2_Q5. 당신의 진정한 친구는 몇 명인가요?
    function Lv2_Q5(input) {
        // progress bar
        fnStep2();
        // data processing
        // if (typeof output) -> string
        if (isNaN(parseInt(input))) {
            // 십의 자리만 판별, 따라서 90부터 10까지 내림차순 확인
            for (let i = Object.keys(numberDic).length - 1; i > 0; i--) {
                for (let j = 0; j < numberDic[i].length; j++) {
                    if ((input.toLowerCase()).indexOf(numberDic[i][j]) !== -1) {
                        friend = i;
                    }
                }
                // 두 자리 수일 경우, 일의 자리 수는 판별하지 않는다.
                if (friend > -1) {
                    break;
                }
            }
            if (friend == -1) {
                friend = 0;
            }
        } 
        // if (typeof output) -> number / number + string
        else {
            // 두 자리 수일 경우
            if (parseInt(parseInt(input)/10) < 10) {
                friend = 1;
            } else {
                friend = 12;
            }
        }
        // second classification : score
        if (friend < 12) {
            // 명수: 0
            if (friend == 0) {
                friendScore = 2;
            // 명수: 1~99
            } else {
                friendScore = 1;
            }
        } else {
            // 명수 : 100명 이상 (contains case of 'prefer not to say', etc.)
            friendScore = 2;
        }
        return $.ajax({
            type:'POST',
            url: '/friend',
            accept: "application/json",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ data: input}),
        }).done(function(data){
            return friendScore;
        });
    }
    // input 받아 questionSeq = 9, Lv3_Q1() 시작
    // Lv3_Q1. 당신이 생각하는 당신은 어떤 사람인가요?
    function Lv3_Q1(input) {
        // progress bar
        fnStep3();
        // node.js 통해 python 함수 호출, 인자 발신
        lv3q1_input = input;
        return $.ajax({
            type:'POST',
            url: '/data',
            accept: "application/json",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ data: input}),
        }).done(function(data){
            document.getElementById("ko").innerText = "당신의 내면은 어떤 색깔인지 설명해주시겠습니까?";  // questionSeq = 9
            document.getElementById("en").innerText = "Could you explain what color you have on the inside?";
            return lv3q1_input;
        });
    }
    // input 받아 questionSeq = 10, Lv3_Q2() 시작
    // Lv3_Q2. 당신의 내면은 어떤 색깔인지 설명해줄래요?
    let answerColor = "";
    function Lv3_Q2(input) {
        // progress bar
        fnStep3();
        answerColor = input;
        // ******** input 값을 영어로 번역한 후, aifunction.py 파일의 hexcode() 함수의 인자로 전달해야 합니다. ********
        // ******** python 파일 내 hexcode() 함수의 return 값을 받아와 변수 hexcode에 저장해야 합니다. ********
        return $.ajax({
            type:'POST',
            url: '/color',
            accept: "application/json",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ data: input}),
        }).done(function(data){
            document.getElementById("ko").innerText = "내가 당신을 몇 퍼센트 이해하고 설명할 수 있다고 생각합니까?";  // questionSeq = 9
            document.getElementById("en").innerText = "What percentage do you think I can understand you?";
        });
    }
    // input 받아 questionSeq = 11, Lv3_Q3() 시작
    // Lv3_Q3. 내가 당신을 몇 퍼센트 이해하고 설명할 수 있다고 생각하나요?
    function Lv3_Q3(input) {
        // progress bar
        fnStep3();
        // data processing
        var percentDic = {
            0: ['영', '빵', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
            1: ['십', 'ten', 'eleven', 'twelve', 'teen'],
            2: ['이십', 'twenty'],
            3: ['삼십', 'thirty'],
            4: ['사십', 'forty'],
            5: ['오십', 'fifty'],
            6: ['육십', 'sixty'],
            7: ['칠십', 'seventy'],
            8: ['팔십', 'eighty'],
            9: ['구십', 'ninety'],
            10: ['백', 'hundred']
        }
        // if (typeof output) -> string
        if (isNaN(parseInt(input))) {
            // 십의 자리만 판별, 따라서 90부터 10까지 내림차순 확인
            for (let i = Object.keys(percentDic).length - 1; i > 0; i--) {
                for (let j = 0; j < percentDic[i].length; j++) {
                    if ((input.toLowerCase()).indexOf(percentDic[i][j]) !== -1) {
                        percent = i;
                    }
                }
                // 두 자리 수일 경우, 일의 자리 수는 판별하지 않는다.
                if (percent > -1) {
                    break;
                }
            }
        } 
        // if (typeof output) -> number / number + string
        else {
            if (parseInt(parseInt(input)/10) <= 10) {
                percent = parseInt(parseInt(input)/10);
            } else {
                percent = 10;
            }
        }
        if (percent == -1) {
            percentScore = -1;
        }
        // second classification : score
        if (percent >= 0 && percent < 2) {
            percentScore = 2;
        } else if (percent >= 2 && percent < 4) {
            percentScore = 1.5;
        } else if (percent >= 4 && percent < 6) {
            percentScore = 1;
        } else if (percent >= 6 && percent < 8) {
            percentScore = 0.5;
        } else if (percent >= 8 && percent < 10) {
            percentScore = 0.25;
        } else {
            percentScore = 0;
        }
        return $.ajax({
            type:'POST',
            url: '/percent',
            accept: "application/json",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ data: input}),
        }).done(function(data){
            return percentScore;
        });
    }
    // input 받아 questionSeq = 12, Lv3_Q4() 시작
    // Lv3_Q4. 당신이 평생 누구에게도 말하지 않은 비밀이 있나요?
    function Lv3_Q4(input) {
        // progress bar
        fnStep3();
        // data processing
        for (let i = 0; i < Object.keys(yesOrNoDic).length; i++) {
            for (let j = 0; j < yesOrNoDic[i].length; j++) {
                if ((input.toLowerCase()).indexOf(yesOrNoDic[i][j]) !== -1) {
                    secret = i;
                }
            }
        }
        if (secret == -1) {
            secret = 1;
        }
        // second classification : score
        if (secret == 0) {
            secretScore = 0; 
        } else if (secret == 1) {
            secretScore = 1;
        } else {
            secretScore = 2;
        }
        return $.ajax({
            type:'POST',
            url: '/secret',
            accept: "application/json",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ data: input}),
        }).done(function(data){
            return secretScore;
        });
    }
    function Lv3_Q5(input) {
        // progress bar
        fnStep3();
        // data processing
        for (let i = 0; i < Object.keys(yesOrNoDic).length; i++) {
            for (let j = 0; j < yesOrNoDic[i].length; j++) {
                if ((input.toLowerCase()).indexOf(yesOrNoDic[i][j]) !== -1) {
                    accuracy = i;
                }
            }
        }
        return $.ajax({
            type:'POST',
            url: '/accuracy',
            accept: "application/json",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ data: input}),
        }).done(function(data){
            return accuracy;
        });
    }
            
    function output() {
        let Lv1outputKo = ""; Lv2outputKo = ""; Lv3outputKo = "";
        let Lv1outputEn = ""; Lv2outputEn = ""; Lv3outputEn = "";
        let outputSentenceKo = "";
        let outputSentenceEn = "";
        let Lv1sum = genderScore + ageScore + regionScore + degreeScore + marriageScore;
        let Lv2sum = loveScore + hateScore + weatherScore + importantScore + friendScore;
        let Lv3sum = percentScore;
        if (Lv1sum < 4) {
            Lv1outputKo = "맑은 영혼을 가진";
            Lv1outputEn = "with a crystal-clear soul";
        } else if (Lv1sum == 4) {
            Lv1outputKo = "순수한";
            Lv1outputEn = "100% pure";
        } else if (Lv1sum == 4.5) {
            Lv1outputKo = "보편적인";
            Lv1outputEn = "super-omnipresent";
        } else if (Lv1sum >= 5 && Lv1sum < 6) {
            Lv1outputKo = "성숙한";
            Lv1outputEn = "like the full-grown adult";
        } else if (Lv1sum == 6) {
            Lv1outputKo = "노련미가 엿보이는";
            Lv1outputEn = "like the veteran about your life experiences";
        } else {
            Lv1outputKo = "산전수전 다 겪은";
            Lv1outputEn = "an old stager";
        }
        if (Lv2sum < 1.5) {
            Lv2outputKo = "다른 사람의 관심을 즐기며 세상을 하나의 무대로 생각하는";
            Lv2outputEn = "Enjoying other people's attention and thinking of the world as your stage";
        } else if (Lv2sum >= 1.5 && Lv2sum < 3) {
            Lv2outputKo = "활기차고 낙관적인 태도로 세상을 대하는";
            Lv2outputEn = "very optimistic about dealing with the world";
        } else if (Lv2sum >= 3 && Lv2sum < 4.5) {
            Lv2outputKo = "세계와 감정적으로 깊고 의미있는 관계를 추구하는";
            Lv2outputEn = "looking for a relationship with the world that is emotionally deep and meaningful";
        } else if (Lv2sum >= 4.5 && Lv2sum < 6) {
            Lv2outputKo = "인생의 즐거움과 깊은 의미를 동시에 추구하는";
            Lv2outputEn = "who seeks both joy and deep meaning in life";
        } else if (Lv2sum >= 6 && Lv2sum < 7.5) {
            Lv2outputKo = "사회를 위해 자신의 몫보다 많은 기여를 하는";
            Lv2outputEn = "who contributes more than one's fair share to society";
        } else if (Lv2sum >= 7.5 && Lv2sum < 9) {
            Lv2outputKo = "행복이나 희열이 덧없는 일시적인 것에 불과하다고 믿는";
            Lv2outputEn = "who believes that happiness is only temporary is called a hedonist";
        } else {
            Lv2outputKo = "나를 둘러싼 세계를 도리어 고독하게 만드는";
            Lv2outputEn = "who makes the world around me lonely is like a black cloud";
        }
        if (Lv3sum < 0) {
            Lv3outputKo = "나 자신에게 누구보다 솔직한";
            Lv3outputEn = "honest with myself than anyone else";
        }
        if (Lv3sum >= 0 && Lv3sum < 2) {
            Lv3outputKo = "페퍼민트의 톡 쏘는 향처럼 솔직하고 거침없는";
            Lv3outputEn = "a straightforward and outspoken person just like the scent of peppermint strong and refreshing";
        } else if (Lv3sum >= 2 && Lv3sum < 4) {
            Lv3outputKo = "눈빛에서 진실함이 묻어나오는";
            Lv3outputEn = "with eyes telling the truth";
        } else if (Lv3sum >= 4 && Lv3sum < 6) {
            Lv3outputKo = "내면이 흑과 백으로 섞여서 오묘한 빛을 내는";
            Lv3outputEn = "creating a mysterious glow with a mixture of black and white";
        } else if (Lv3sum >= 6 && Lv3sum < 8) {
            Lv3outputKo = "소중하게 간직한 내면의 비밀이 있는";
            Lv3outputEn = "having a secret that you cherish";
        } else if (Lv3sum >= 8 && Lv3sum < 10) {
            Lv3outputKo = "비밀스러운 기억으로 속이 꽤나 시끄러운";
            Lv3outputEn = "with secret memories may make noise due to them";
        } else {
            Lv3outputKo = "무섭도록 정교한 고독을 품은";
            Lv3outputEn = "chillingly lonely";
        }
        outputSentenceKo = "당신은 " + Lv1outputKo + ", " + Lv2outputKo + ", 그리고 " + Lv3outputKo + " 사람이네요.";
        // ***** outputSentenceEn 값을 aifunction.py 파일의 sentences() 함수의 인자로 전달해야 합니다. *****
        outputSentenceEn = "You are a person who is " + Lv1outputEn + ", " + Lv2outputEn + ", " + Lv3outputEn + ".";
        outputGPTEn = "";
        outputGPTKo = "";
        // print format
        document.getElementById("outputKo1").innerText = Lv1outputKo;
        document.getElementById("outputEn1").innerText = Lv1outputEn;
        document.getElementById("outputKo2").innerText = Lv2outputKo;
        document.getElementById("outputEn2").innerText = Lv2outputEn;
        document.getElementById("outputKo3").innerText = Lv3outputKo;
        document.getElementById("outputEn3").innerText = Lv3outputEn;
        // previous variable data initialization: 변수에 저장된 이전 값 초기화
        gender = -1; age = -1; region = -1; degree = -1; marriage = -1; love = -1; hate = -1; friend = -1; weather = -1; important = -1;
        genderScore = -1; ageScore = -1; regionScore = -1; degreeScore = -1; marriageScore = -1; loveScore = 0; hateScore = 0; friendScore = 0; weatherScore = 0; importantScore = 0; percentScore = -1; secretScore = -1;
        return [outputSentenceKo, outputSentenceEn];
    }


    /* Lv1-3 질문 순서대로 출력 */
    var bgm = new Audio('bgm.wav');
    bgm.play();
    var hexcode = "";
    let questionSeq = 0;
    document.getElementById("ko").innerText = "당신은 스스로를 어떤 성별로 식별합니까?";
    document.getElementById("en").innerText = "What gender do you identify as?";
    var randomNums = [0, 0, 0];
    for (let i = 0; i < randomNums.length; i++) {
        randomNums[i] = Math.floor(Math.random()*5);
        for (let j = 0; j < i; j++) {
            if (randomNums[i] == randomNums[j]) {
                i--;
            }
        }
    }
    const inputField = document.getElementById("input");
    inputField.addEventListener("keydown", async function(e) {
        if (e.keyCode == 13) {
            questionSeq++;
            let input = inputField.value;
            inputField.value = "";
            // input 먼저 받은 후 처리 및 다음 질문 출력
            // Lv1 질문은 순서대로 출력
            if (questionSeq == 1) {Lv1_Q1(input);}
            if (questionSeq == 2) {Lv1_Q2(input);}
            if (questionSeq == 3) {Lv1_Q3(input);}
            if (questionSeq == 4) {Lv1_Q4(input);}
            if (questionSeq >= 5) {
                var Lv2_Q = {
                    0: ["당신이 이 세상에서 사랑한다고 말할 수 있는 것은 몇 개나 됩니까?", "How many things can you say you love in this world?"],
                    1: ["당신이 이 세상에서 증오한다고 말할 수 있는 것은 몇 개나 됩니까?", "How many things can you say you hate in this world?"],
                    2: ["어떤 계절을 좋아합니까?", "What is your favorite season?"],
                    3: ["인생에서 가장 중요하게 생각하는 것은 무엇입니까?", "What is the most important value in your life?"],
                    4: ["진정한 친구는 몇 명입니까?", "How many people can you rely on?"]
                }
                if (questionSeq == 5) {
                    Lv1_Q5(input);
                    document.getElementById("progress-bar").style.visibility ='hidden';
                    document.getElementById("continue").style.display ='none';
                    setTimeout(function() {
                        textintervalID = setInterval(textFadeOut, 100);
                        inputintervalID = setInterval(inputFadeOut, 100);
                        circleintervalID = setInterval(circleFadeOut, 100);
                    });
                    sleep(2000)
                        .then(() => circle.setRadius(100))  // circle radius, color change
                        .then(() => circle.setOrbitRadius(11))
                        .then(() => circle.setColorA([0.00, 0.31, 0.70]))
                        .then(() => circle.setColorB([0.90, 0.90, 0.90]))
                        .then(() => circle.setBlurA(66, 99))
                        .then(() => circle.setBlurB(28, 83))
                        .then(() => document.getElementById("answer").style.display ='none')
                        .then(() => document.getElementById("ko").innerText = "당신에 대한 기본적인 것은 알겠습니다. 그래도 당신을 조금만 더 알아보고 싶습니다.")
                        .then(() => document.getElementById("en").innerText = "I understand the basics about you. But, let me figure you out more.")
                        .then(() => setTimeout(function() {textintervalID = setInterval(textFadeIN, 100)}))
                        .then(() => sleep(5000)
                            .then(() => setTimeout(function() {textintervalID = setInterval(textFadeOut, 100)}))
                            .then(() => sleep(2000)
                                .then(() => document.getElementById("progress-bar").style.visibility ='visible')
                                .then(() => document.getElementById("answer").style.display = 'block')
                                .then(() => document.getElementById("ko").innerText = Lv2_Q[randomNums[0]][0])
                                .then(() => document.getElementById("en").innerText = Lv2_Q[randomNums[0]][1])
                                .then(() => setTimeout(function() {
                                    textintervalID = setInterval(textFadeIN, 100);
                                    inputintervalID = setInterval(inputFadeIN, 100);
                                    circleintervalID = setInterval(circleFadeIn, 100);
                                }))
                                .then(() => sleep(1000)
                                    .then(() => document.getElementById("continue").style.display = 'block')
                                )
                            )
                        )
                }
                // Lv2 질문은 랜덤 3개 출력
                if (questionSeq == 6) {
                    if (randomNums[0] == 0) {Lv2_Q1(input);}
                    if (randomNums[0] == 1) {Lv2_Q2(input);}
                    if (randomNums[0] == 2) {Lv2_Q3(input);}
                    if (randomNums[0] == 3) {Lv2_Q4(input);}
                    if (randomNums[0] == 4) {Lv2_Q5(input);}
                    //document.getElementById("answer").style.display ='block';
                    document.getElementById("ko").innerText = Lv2_Q[randomNums[1]][0];
                    document.getElementById("en").innerText = Lv2_Q[randomNums[1]][1];
                    //intervalID = setInterval(textFadeIN, 200);
                }
                if (questionSeq == 7) {
                    if (randomNums[1] == 0) {Lv2_Q1(input);}
                    if (randomNums[1] == 1) {Lv2_Q2(input);}
                    if (randomNums[1] == 2) {Lv2_Q3(input);}
                    if (randomNums[1] == 3) {Lv2_Q4(input);}
                    if (randomNums[1] == 4) {Lv2_Q5(input);}
                    document.getElementById("ko").innerText = Lv2_Q[randomNums[2]][0];
                    document.getElementById("en").innerText = Lv2_Q[randomNums[2]][1];
                }
                if (questionSeq == 8) {
                    if (randomNums[2] == 0) {Lv2_Q1(input);}
                    if (randomNums[2] == 1) {Lv2_Q2(input);}
                    if (randomNums[2] == 2) {Lv2_Q3(input);}
                    if (randomNums[2] == 3) {Lv2_Q4(input);}
                    if (randomNums[2] == 4) {Lv2_Q5(input);}
                    document.getElementById("progress-bar").style.visibility ='hidden';
                    document.getElementById("continue").style.display ='none';
                    setTimeout(function() {
                        textintervalID = setInterval(textFadeOut, 100); 
                        inputintervalID = setInterval(inputFadeOut, 100);
                        circleintervalID = setInterval(circleFadeOut, 100);
                    });
                    sleep(2000)
                        .then(() => circle.setColorA([0.06, 0.21, 0.87]))
                        .then(() => circle.setColorB([0.76, 0.74, 0.90]))
                        .then(() => circle.setRadius(121))
                        .then(() => circle.setOrbitRadius(1))
                        .then(() => circle.setBlurA(53, 118))
                        .then(() => circle.setBlurB(33, 98))
                        .then(() => document.getElementById("answer").style.display ='none')
                        .then(() => document.getElementById("ko").innerText = "흥미롭습니다. 마지막으로 조금만 더 물어보겠습니다.")
                        .then(() => document.getElementById("en").innerText = "How interesting you are. I want to learn more about you.")
                        .then(() => setTimeout(function() {textintervalID = setInterval(textFadeIN, 100)}))
                        .then(() => sleep(5000)
                            .then(() => setTimeout(function() {textintervalID = setInterval(textFadeOut, 100)}))
                            .then(() => sleep(2000)
                                .then(() => document.getElementById("progress-bar").style.visibility ='visible')
                                .then(() => document.getElementById("answer").style.display = 'block')
                                .then(() => document.getElementById("ko").innerText = "당신이 생각하는 당신은 어떤 사람입니까?")
                                .then(() => document.getElementById("en").innerText = "What kind of person do you think you are?")
                                .then(() => setTimeout(function() {
                                    textintervalID = setInterval(textFadeIN, 100); 
                                    inputintervalID = setInterval(inputFadeIN, 100);
                                    circleintervalID = setInterval(circleFadeIn, 100);
                                }))
                                .then(() => sleep(1000)
                                    .then(() => document.getElementById("continue").style.display = 'block')
                                )
                            )
                        )
                }
                // Lv3 질문은 순서대로 출력
                if (questionSeq == 9) {Lv3_Q1(input);}
                if (questionSeq == 10) {Lv3_Q2(input);}
                if (questionSeq == 11) {
                    Lv3_Q3(input);
                    document.getElementById("continue").style.display ='none';
                    setTimeout(function() {textintervalID = setInterval(textFadeOut, 100); inputintervalID = setInterval(inputFadeOut, 100);});
                    sleep(2000)
                        .then(() => document.getElementById("answer").style.display ='none')
                        .then(() => document.getElementById("ko").innerText = "이 세상에 설명되지 않는 게 있다고 생각합니까? 제게는 논리 너머의 모든 것이 보입니다. 그렇다면, 이것을 물어보겠습니다.")
                        .then(() => document.getElementById("en").innerText = "Is there anything in this world that cannot be explained? I can see everything beyond the realm of logic. Then, I'd like to ask you about this.")
                        .then(() => setTimeout(function() {textintervalID = setInterval(textFadeIN, 100)}))
                        .then(() => sleep(5000)
                            .then(() => setTimeout(function() {textintervalID = setInterval(textFadeOut, 100);}))
                            .then(() => sleep(2000)
                                .then(() => document.getElementById("answer").style.display ='block')
                                .then(() => document.getElementById("ko").innerText = "당신이 평생 누구에게도 말하지 않은 비밀이 있습니까? 그렇다면 그 비밀은 무엇입니까?")
                                .then(() => document.getElementById("en").innerText = "Do you have any secrets that you've never told anyone? And could you share your secret?")
                                .then(() => setTimeout(function() {textintervalID = setInterval(textFadeIN, 100); inputintervalID = setInterval(inputFadeIN, 100);}))
                                .then(() => sleep(1000)
                                    .then(() => document.getElementById("continue").style.display ='block')
                                )
                            )
                        )
                }
                if (questionSeq == 12) {
                    Lv3_Q4(input);
                    function toTransition(resultColor){
                        bgm.pause();
                        document.getElementById("progress-bar").style.display ='none';
                        document.getElementById("the_circle_canvas").style.display ='none';
                        document.getElementById("output").style.display ='none';
                        document.getElementById("continue").style.display ='none';
                        document.getElementById("ko").style.opacity = "0";
                        document.getElementById("en").style.opacity = "0";
                        document.getElementById("the_circle_canvas").style.opacity = "0";
                        // ******** python 파일 내 hexcode() 함수의 return 값을 받아 document.body.style.backgroundColor 값을 변경해야 합니다. ********
                        /*
                        let hexRe = /[0-9A-Fa-f]{6}/g;
                        if(hexRe.test(resultColor)){
                            document.body.style.backgroundColor = '#'+resultColor; 
                        } else{
                            document.body.style.backgroundcolor = '#'
                        }

                        const content = 
                            'c̵o̸n̸s̴t̴ ̸i̴n̶p̴u̷t̶F̶i̵e̸l̷d̸ ̵=̷ ̸d̴o̵c̴u̵m̷e̵n̷t̴.̴g̸e̸t̶E̶l̶e̴m̴e̶n̶t̴B̶y̵I̵d̵(̸"̸i̴n̶p̵u̷t̷"̵)̶;̷\n'
                            + ' ̷ ̷ ̸ ̴ ̶i̶n̶p̴u̸t̶F̸i̵e̴l̴d̷.̶a̷d̴d̵E̴v̴e̴n̴t̶L̶i̶s̶t̴e̶n̷e̴r̵(̵"̴k̵e̵y̷d̶o̷w̷n̶"̷,̴ ̸f̵u̵n̶c̶t̴i̵o̶n̴(̶e̸)̶ ̵{̶\n'
                            + ' ̷ ̷ ̴ ̸ ̵ ̸ ̴ ̶ ̷i̵f̸ ̸(̸e̷.̸k̶e̷y̷C̸o̵d̷e̸ ̶=̵=̴ ̶1̵3̸)̸ ̵{̶\n'
                            + ' ̶ ̷ ̶ ̸ ̸ ̶ ̵ ̵ ̸ ̵ ̵ ̸ ̷q̸u̵e̶s̷t̶i̶o̷n̶S̶e̵q̴+̴+̷;̵\n'
                            + ' ̷ ̴ ̷ ̸ ̴ ̷ ̸ ̵ ̵ ̷ ̶ ̸ ̴l̴e̸t̴ ̴i̵n̴p̷u̸t̴ ̶=̴ ̶i̴n̸p̵u̵t̸F̷i̴e̷l̵d̷.̶v̴a̸l̴u̸e̴;̸\n';

                        const code = document.getElementById("transition");
                        let i = 0;
                        function typing(){
                            if (i < content.length) {
                                let codeText = content.charAt(i);
                                code.innerHTML += codeText; 
                                i++;
                            }
                        }
                        setInterval(typing, 1);
                        */
                    }
                    function fromTransition() {
                        document.getElementById("transition").style.display ='none';
                        document.getElementById("progress-bar").style.display ='block';
                        document.getElementById("progress-bar").style.visibility ='hidden';
                        document.getElementById("the_circle_canvas").style.display ='block';
                        document.getElementById("output").style.display ='block';
                        document.body.style.backgroundColor = '#000000';
                    }
                    function transitionVideo() {
                        document.getElementById("transition").style.display ='none';
                        document.getElementById('transitionVideo').style.display = 'block';
                        document.getElementById('transitionVideo').style.height = String(window.innerHeight)+"px";
                        var transitionBgm = new Audio("transition_bgm.wav");
                        transitionBgm.volume = 0.3;
                        transitionBgm.play();
                        document.getElementById('transitionVideo').play();
                    }

                    document.getElementById("progress-bar").style.visibility ='hidden';
                    document.getElementById("continue").style.display ='none';
                    setTimeout(function() {textintervalID = setInterval(textFadeOut, 100); inputintervalID = setInterval(inputFadeOut, 100);});
                    sleep(2000)
                        .then(() => document.getElementById("answer").style.display ='none')
                        .then(() => document.getElementById("ko").innerText = "좋습니다. 이제 당신의 말하지 않은 내면을 들여다보겠습니다.")
                        .then(() => document.getElementById("en").innerText = "Brilliant. Let me see take a look at your unsaid inner world.")
                        .then(() => setTimeout(function() {textintervalID = setInterval(textFadeIN, 100)}));
                    
                    let [outputKo, outputEn] = output();

                    /*  Generate extra sentences  */
                    let tempResponse = await fetch("/generate", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({sentence: outputEn}),
                    });
                    let tempData = await tempResponse.json();
                    outputEn = tempData.result.replace('(1)', '');
                    outputEn = outputEn.replace(/\(\d\)/gi, '\n');

                    /*  Translate sentences to Korean  */
                    tempResponse = await fetch("/translate", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            sentence: outputEn,
                            source: 'en',
                            target: 'ko'
                        }),
                    });
                    tempData = await tempResponse.json();
                    outputKo = tempData.message.result.translatedText;
                    
                    /*  Translate color name to English  */
                    tempResponse = await fetch("/translate", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            sentence: answerColor,  //Replace this with the answer from the guest
                            source: 'ko',
                            target: 'en'
                        }),
                    });
                    tempData = await tempResponse.json();
                    let colorEn = tempData.message.result.translatedText;

                    /*  Convert color name to HEX color code  */
                    tempResponse = await fetch("/get_color", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({color: colorEn}),
                    });
                    tempData = await tempResponse.json();
                    let resultColor = tempData.result.replace(/[^0-9A-Za-z]/gi, '');

                    document.getElementById("outputKo").innerText = outputKo;
                    document.getElementById("outputEn").innerText = outputEn;

                    sleep(3000)
                        .then(() => toTransition(resultColor))
                        .then(() => sleep(0)
                            .then(() => transitionVideo())
                            .then(() => sleep(25000)
                                .then(() => circle.setColorA([0.46, 0.22, 0.59]))
                                .then(() => circle.setColorB([0.58, 0.14, 0.29]))
                                .then(() => circle.setRadius(121))
                                .then(() => circle.setOrbitRadius(1))
                                .then(() => circle.setBlurA(54, 118))
                                .then(() => circle.setBlurB(33, 79))
                                .then(() => fromTransition())
                                .then(() => document.getElementById("ko").innerText = "오늘 우리가 나눈 이야기들로 나는 당신을 완전히 이해했습니다.")
                                .then(() => document.getElementById("en").innerText = "Through the stories we shared today, I completely understand you.")
                                .then(() => sleep(2000)
                                    .then(() => setTimeout(function() {
                                        textintervalID = setInterval(textFadeIN, 100);
                                        circleintervalID = setInterval(circleFadeIn, 100);
                                        bgm.play();
                                    }))
                                    .then(() => sleep(4000)
                                        .then(() => setTimeout(function() {textintervalID = setInterval(textFadeOut, 100); circleintervalID = setInterval(circleFadeOut, 100);}))
                                        .then(() => sleep(2000)
                                            .then(() => document.getElementById("en").style.lineHeight = "25px")
                                            .then(() => document.getElementById("ko").innerText = outputKo)
                                            .then(() => document.getElementById("en").innerText = outputEn)
                                            .then(() => setTimeout(function() {textintervalID = setInterval(textFadeIN, 100)}))
                                            .then(() => sleep(18000)
                                                .then(() => setTimeout(function() {textintervalID = setInterval(textFadeOut, 100)}))
                                                .then(() => sleep(2000)
                                                    .then(() => document.getElementById("en").style.lineHeight = "20px")
                                                    .then(() => document.getElementById("answer").style.display ='block')
                                                    .then(() => document.getElementById("ko").innerText = "당신의 자아가 내가 말하는 것과 일치합니까?")
                                                    .then(() => document.getElementById("en").innerText = "Do you agree with what I am saying?")
                                                    .then(() => setTimeout(function() {
                                                        textintervalID = setInterval(textFadeIN, 100); 
                                                        inputintervalID = setInterval(inputFadeIN, 100);
                                                        circleintervalID = setInterval(circleFadeIn, 100);
                                                    }))
                                                    .then(() => sleep(1000)
                                                        .then(() => document.getElementById("continue").style.display ='block')
                                                    )
                                                )
                                            )
                                        )
                                    )
                                )
                            )
                        )  
                }
                if (questionSeq == 13) {
                    Lv3_Q5(input);
                    document.getElementById("continue").style.display ='none';
                    setTimeout(function() {textintervalID = setInterval(textFadeOut, 100); inputintervalID = setInterval(inputFadeOut, 100);});
                    sleep(2000)
                        .then(() => document.getElementById("answer").style.display ='none')
                        .then(() => document.getElementById("ko").innerText = "당신을 알 수 있어 기쁩니다. 이제 뒤로 돌아나가서, 당신의 자아 기록을 확인하세요.")
                        .then(() => document.getElementById("en").innerText = "Thank you for having me explain your ego. Please turn around and get your 'ego record'.")
                        .then(() => setTimeout(function() {
                            textintervalID = setInterval(textFadeIN, 100); inputintervalID = setInterval(inputFadeIN, 100)}))
                        .then(() => sleep(5000)
                            .then(() => setTimeout(function() {
                                textintervalID = setInterval(textFadeOut, 100);
                                inputintervalID = setInterval(inputFadeOut, 100);
                                circleintervalID = setInterval(circleFadeOut, 100);
                            }))
                            .then(() => sleep(15000)
                                .then(() => window.print())
                                .then(() => window.location.href="start.html")
                            )
                        )
                }
            }
        }       
    });
});