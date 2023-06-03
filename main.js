'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let surfaceType;
let height = 1.5;
let step = 20;
let radius = 5;
let userRotAngle;
let bg_surface;
let sound_surface;
let video;
let track;
let origTex;
let webCamTex;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

function GetCirclePoint(angle) {
    angle = deg2rad(angle);
    let x = radius * Math.cos(angle);
    let y = 0;
    let z = radius * Math.sin(angle);
    return [x, y, z];
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    // this.iNormalBuffer = gl.createBuffer();
    this.count = 0;
    this.iTextureBuffer = gl.createBuffer();
    this.countText = 0;

    this.BufferData = function (vertices, normals) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }
    this.TextureBufferData = function (points) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STREAM_DRAW);

        this.countText = points.length / 2;
    }

    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexture, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexture);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);

    }
    this.DrawSound = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);

    }
}

function CreateSphereSurface(r) {
    let vertexList = [];
    let lon = -Math.PI;
    let lat = -Math.PI * 0.5;
    const STEP = 0.1;
    while (lon < Math.PI) {
        while (lat < Math.PI * 0.5) {
            let v1 = sphereSurfaceDate(r, lon, lat);
            let v2 = sphereSurfaceDate(r, lon + STEP, lat);
            let v3 = sphereSurfaceDate(r, lon, lat + STEP);
            let v4 = sphereSurfaceDate(r, lon + STEP, lat + STEP);
            vertexList.push(v1.x, v1.y, v1.z);
            vertexList.push(v2.x, v2.y, v2.z);
            vertexList.push(v3.x, v3.y, v3.z);
            vertexList.push(v3.x, v3.y, v3.z);
            vertexList.push(v4.x, v4.y, v4.z);
            vertexList.push(v2.x, v2.y, v2.z);
            lat += STEP;
        }
        lat = -Math.PI * 0.5
        lon += STEP;
    }
    return vertexList;
}

function sphereSurfaceDate(r, u, v) {
    let x = r * Math.sin(u) * Math.cos(v);
    let y = r * Math.sin(u) * Math.sin(v);
    let z = r * Math.cos(u);
    return { x: x, y: y, z: z };
}

// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = 1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    // Normals
    this.iNormal = -1;
    this.iNormalMatrix = -1;

    // Ambient, diffuse, specular
    this.iAmbientColor = -1;
    this.iDiffuseColor = -1;
    this.iSpecularColor = -1;
    this.iAmbientCoefficient = -1;
    this.iDiffuseCoefficient = -1;
    this.iSpecularCoefficient = -1;
    // Shininess
    this.iShininess = -1;

    // Light position
    this.iLightPos = -1;

    this.iAttribTexture = -1;

    this.iUserPoint = -1;
    this.irotAngle = 0;
    this.iUP = -1;
    this.iTMU = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
let convergence = 1000;
let eyeSeparation = 70;
let fieldOfView = Math.PI / 8;
let near = 10;
let a;
let b;
let c;
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI / 8, 1, 8, 1000);

    /* Get the view matrix from the SimpleRotator object.*/
    // let modelView = spaceball.getViewMatrix();
    let modelView = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    let initialView = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let faceUser = m4.axisRotation([0.707, 0.707, 0], 0.);
    let translateToPointZero = m4.multiply(m4.scaling(0.2, 0.2, 0.2), m4.translation(0, 0, -1));
    let translateToCenter = m4.translation(-2, -2, -10);
    let scaleToFit = m4.scaling(4, 4, 1);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccumInitial0 = m4.multiply(faceUser, initialView);
    let matAccumInitial1 = m4.multiply(scaleToFit, matAccumInitial0);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
    let matAccumBG = m4.multiply(translateToCenter, matAccumInitial1);

    readValues();

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);
    let modelViewMat;
    let projectionMat;



    /* Draw the six faces of a cube, with different colors. */
    gl.uniform1i(shProgram.iTMU, 0);
    gl.enable(gl.TEXTURE_2D);
    gl.uniform1f(shProgram.irotAngle, userRotAngle);

    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumBG);
    gl.colorMask(true, true, true, true);
    gl.bindTexture(gl.TEXTURE_2D, webCamTex);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        video
    );
    bg_surface.Draw();
    gl.clear(gl.DEPTH_BUFFER_BIT);
    let rotate = vectorFromAngles(sensorFusion.x, sensorFusion.y, sensorFusion.z);
    let multiplier = 1.25
    let translateSphere = m4.translation(rotate[0] * multiplier, rotate[1] * multiplier, rotate[2] * multiplier)
    if (manipulator) {
        manipulator.setPosition(rotate[0] * multiplier, rotate[1] * multiplier, rotate[2] * multiplier);
    }
    // console.log(rotate)
    // let translateSphere = m4.translation(0, 0, 0)
    let matAccumRed = m4.multiply(applyRedMat(), matAccum1);
    let matBeforeRotateRed = m4.multiply(applyRedMat(), matAccum1)
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matBeforeRotateRed);

    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection);
    gl.colorMask(true, false, false, false);
    gl.bindTexture(gl.TEXTURE_2D, origTex);
    surface.Draw();
    gl.clear(gl.DEPTH_BUFFER_BIT);
    let matAccumBlue = m4.multiply(applyBlueMat(), matAccum1);
    // let matBeforeRotateBlue = m4.multiply(m4.multiply(applyBlueMat(), matAccum1), getRotationMatrix())
    let matBeforeRotateBlue = m4.multiply(applyBlueMat(), matAccum1)
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matBeforeRotateBlue);
    gl.colorMask(false, true, true, false);
    surface.Draw();
    gl.colorMask(true, true, true, true);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, m4.multiply(matBeforeRotateBlue, translateSphere));
    sound_surface.DrawSound();
}

function redraw() {
    draw()
    window.requestAnimationFrame(redraw)
}
function readValues() {
    convergence = parseFloat(document.getElementById("Convergence").value);
    eyeSeparation = parseFloat(document.getElementById("EyeSeparation").value);
    fieldOfView = parseFloat(document.getElementById("FieldOfView").value);
    near = parseFloat(document.getElementById("NearClippingDistance").value);
    // console.log(convergence);
}

function applyRedMat() {
    let top, bottom, left, right, far;
    far = 1000.0;
    top = near * Math.tan(fieldOfView / 2.0);
    bottom = -top;
    a = 1.0 * Math.tan(fieldOfView / 2.0) * convergence;

    b = a - eyeSeparation / 2;
    c = a + eyeSeparation / 2;

    left = -b * near / convergence;
    right = c * near / convergence;
    return m4.frustum(
        left,
        right,
        bottom,
        top,
        near,
        far
    );
}

function applyBlueMat() {
    let top, bottom, left, right, far;
    far = 1000.0;
    top = near * Math.tan(fieldOfView / 2.0);
    bottom = -top;
    a = 1.0 * Math.tan(fieldOfView / 2.0) * convergence;

    b = a - eyeSeparation / 2;
    c = a + eyeSeparation / 2;

    left = -c * near / convergence;
    right = b * near / convergence;
    return m4.frustum(
        left,
        right,
        bottom,
        top,
        near,
        far
    );
}

function rerender() {
    let surfaceData = CreateSurfaceData()
    surface.BufferData(surfaceData[0], surfaceData[1]);
    draw();
}

function getX(u, v, alpha, phi, theta, c) {
    return c * u + v * (Math.sin(phi) + Math.tan(alpha) * Math.cos(phi) * Math.cos(theta));
}

function getY(v, alpha, theta) {
    return v * Math.tan(alpha) * Math.sin(theta);
}

function getZ(v, alpha, phi, theta, H) {
    return H + v * (Math.tan(alpha) * Math.sin(phi) * Math.cos(theta) - Math.cos(phi));
}

function getDerivativeU(u, v, alpha, phi, c, p, theta0) {
    let dx_du = c - p * v * Math.tan(alpha) * Math.cos(phi) * Math.sin(p * u + theta0);
    let dy_du = p * v * Math.tan(alpha) * Math.cos(p * u + theta0);
    let dz_du = -p * v * Math.tan(alpha) * Math.sin(phi) * Math.sin(p * u + theta0);
    return [dx_du, dy_du, dz_du];
}

function getDerivativeV(u, alpha, phi, p, theta0,) {
    let dx_dv = Math.tan(alpha) * Math.cos(phi) * Math.cos(p * u + theta0) + Math.sin(phi);
    let dy_dv = Math.tan(alpha) * Math.sin(p * u + theta0);
    let dz_dv = Math.tan(alpha) * Math.sin(phi) * Math.cos(p * u + theta0) - Math.cos(phi);
    return [dx_dv, dy_dv, dz_dv];
}

function CreateTextureData() {
    let vertexList = [];
    const H = 1;
    const c = 5;
    const p = 8 * Math.PI
    const alpha = 0.033 * Math.PI;
    const theta0 = 0;
    const phi = 0 * Math.PI;
    let uStep = 0.005;
    for (let u = 0; u < 1; u += uStep) {
        for (let v = -5; v < 5; v += 0.01) {
            let v1 = map(v, -5, 5, 0, 1)
            vertexList.push(u, v);
            vertexList.push(u + uStep, v);
        }
    }
    return vertexList;
}

function CreateSurfaceData() {
    let vertexList = [];
    let normalsList = [];

    const H = 1;
    const c = 5;
    const p = 8 * Math.PI
    const alpha = 0.033 * Math.PI;
    const theta0 = 0;
    const phi = 0 * Math.PI;

    let step = 0.05;
    let uStep = 0.005;
    for (let u = 0; u < 1; u += uStep) {
        for (let v = -5; v < 5; v += 0.01) {
            let theta = p * u + theta0;
            let x = getX(u, v, alpha, phi, theta, c);
            let y = getY(v, alpha, theta);
            let z = getZ(v, alpha, p, theta, H);
            let derU = getDerivativeU(u, v, x, y, z, alpha, phi, c, p, theta0);
            let derV = getDerivativeV(u, v, x, y, z, alpha, phi, p, theta0);
            let res = m4.cross(derU, derV);

            vertexList.push(x * 0.35, y * 0.35, z * 0.35);
            normalsList.push(res[0], res[1], res[2]);

            theta = p * u + step + theta0;
            x = getX(u + step, v, alpha, phi, theta, c);
            y = getY(v, alpha, theta);
            z = getZ(v, alpha, p, theta, H);
            derU = getDerivativeU(u, v, x, y, z, alpha, phi, c, p, theta0);
            derV = getDerivativeV(u, v, x, y, z, alpha, phi, p, theta0);
            res = m4.cross(derU, derV);

            vertexList.push(x * 0.35, y * 0.35, z * 0.35);
        }
    }
    return [vertexList, normalsList];
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");


    shProgram.iAttribTexture = gl.getAttribLocation(prog, "texture");
    shProgram.irotAngle = gl.getUniformLocation(prog, 'rotA');
    shProgram.iTMU = gl.getUniformLocation(prog, 'tmu');

    surface = new Model('Surface');
    bg_surface = new Model('Background');
    sound_surface = new Model('Sphere');
    let surfaceData = CreateSurfaceData()
    surface.BufferData(surfaceData[0]);
    let bg_surfaceData = [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0];
    bg_surface.BufferData(bg_surfaceData);
    LoadTexture()
    surface.TextureBufferData(CreateTextureData());
    let bg_surfaceTextureData = [0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0];
    bg_surface.TextureBufferData(bg_surfaceTextureData);
    let sound_surfaceData = CreateSphereSurface(0.1)
    sound_surface.BufferData(sound_surfaceData)
    // sound_surface.TextureBufferData(bg_surfaceTextureData);
    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
let song = null;
function init() {
    userRotAngle = 0.0;
    let canvas;
    song = document.getElementById('song');
    initAudio()
    window.addEventListener('deviceorientation', e => {
        sensorFusion.z = -e.alpha / 180 * Math.PI;
        sensorFusion.x = -e.beta / 180 * Math.PI;
        sensorFusion.y = -e.gamma / 180 * Math.PI;
    }, true);

    video = document.createElement('video');
    video.setAttribute('autoplay', true);
    window.vid = video;


    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        getWebcam();
        webCamTex = CreateWebCamTexture();
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    redraw();
}
function LoadTexture() {
    origTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, origTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const image = new Image();
    image.crossOrigin = 'anonymus';
    image.src = "https://raw.githubusercontent.com/Vad1ks/webGL_Labs/CGW/texture.jpg";
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, origTex);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );
        console.log("imageLoaded")
        draw()
    }
}


function map(val, f1, t1, f2, t2) {
    let m;
    m = (val - f1) * (t2 - f2) / (t1 - f1) + f2
    return Math.min(Math.max(m, f2), t2);
}

function getWebcam() {
    navigator.getUserMedia({ video: true, audio: false }, function (stream) {
        video.srcObject = stream;
        track = stream.getTracks()[0];
    }, function (e) {
        console.error('Rejected!', e);
    });
}

function CreateWebCamTexture() {
    let textureID = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textureID);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return textureID;
}

let sensorFusion = {
  x: 0,
  y: 0,
  z: 0
}


function getRotationMatrix() {
  var _x = sensorFusion.x;
  var _y = sensorFusion.y;
  var _z = sensorFusion.z;

  var cX = Math.cos(_x);
  var cY = Math.cos(_y);
  var cZ = Math.cos(_z);
  var sX = Math.sin(_x);
  var sY = Math.sin(_y);
  var sZ = Math.sin(_z);

  //
  // ZXY rotation matrix construction.
  //

  var m11 = cZ * cY - sZ * sX * sY;
  var m12 = - cX * sZ;
  var m13 = cY * sZ * sX + cZ * sY;

  var m21 = cY * sZ + cZ * sX * sY;
  var m22 = cZ * cX;
  var m23 = sZ * sY - cZ * cY * sX;

  var m31 = - cX * sY;
  var m32 = sX;
  var m33 = cX * cY;

  return [
    m11, m12, m13, 0,
    m21, m22, m23, 0,
    m31, m32, m33, 0,
    0, 0, 0, 1
  ];

};


let webAudio;
let bandpassFilter;
let manipulator;

function initAudio() {
    let chek = document.getElementById('check');


    song.addEventListener('play', () => {
        if (!webAudio) {
            webAudio = new AudioContext();
            let source = webAudio.createMediaElementSource(song);
            manipulator = webAudio.createPanner();
            bandpassFilter = webAudio.createBiquadFilter();

            source.connect(manipulator);
            manipulator.connect(bandpassFilter);
            bandpassFilter.connect(webAudio.destination);

            bandpassFilter.type = 'bandpass';
            bandpassFilter.Q.value = 10;
            bandpassFilter.detune.value = 3;
            bandpassFilter.frequency.value = 1550;
            bandpassFilter.gain.value = 6;
            webAudio.resume();
        }
    })
    song.addEventListener('pause', () => {
        console.log('pause');
        webAudio.resume();
    })

    chek.addEventListener('change', function () {
        if (chek.checked) {
            manipulator.disconnect();
            manipulator.connect(bandpassFilter);
            bandpassFilter.connect(webAudio.destination);
            console.log("checked")
        } else {
            manipulator.disconnect();
            manipulator.connect(webAudio.destination);
            console.log("unchecked")
        }
    });
    song.play();
}

function vectorFromAngles(alpha, beta, gamma) {
    const alphaRad = alpha;
    const betaRad = beta;
    const gammaRad = gamma;
    let vector = [0, -1, 0];
    const rotX = [
        [1, 0, 0],
        [0, Math.cos(alphaRad), -Math.sin(alphaRad)],
        [0, Math.sin(alphaRad), Math.cos(alphaRad)]
    ];
    vector = multiplyMatrixVector(rotX, vector);
    const rotY = [
        [Math.cos(betaRad), 0, Math.sin(betaRad)],
        [0, 1, 0],
        [-Math.sin(betaRad), 0, Math.cos(betaRad)]
    ];
    vector = multiplyMatrixVector(rotY, vector);
    const rotZ = [
        [Math.cos(gammaRad), -Math.sin(gammaRad), 0],
        [Math.sin(gammaRad), Math.cos(gammaRad), 0],
        [0, 0, 1]
    ];
    vector = multiplyMatrixVector(rotZ, vector);


    return vector;
}

function multiplyMatrixVector(matrix, vector) {
    const result = [];
    for (let i = 0; i < matrix.length; i++) {
        let sum = 0;
        for (let j = 0; j < vector.length; j++) {
            sum += matrix[i][j] * vector[j];
        }
        result.push(sum);
    }
    return result;
}