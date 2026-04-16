/*
 Copyright (c) 2026 John Talbot. All rights reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

// SU(2) and SO(3) Visualisation

// Global Variables
let scene, camera, renderer, controls;
let subject; // The object we rotate
let axesHelper;

// State
let state = {
    angle: 0, // in degrees, can go up to 720
    axis: new THREE.Vector3(0, 1, 0) // Default axis Y
};

let isAnimating = false;
let targetAngle = 0;

// Config
const CONFIG = {
    colors: {
        bg: 0x0f172a,
        object: 0x69f0ae,
        accent: 0xff4081
    }
};

window.addEventListener('load', init);

function init() {
    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.colors.bg);

    // 2. Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(4, 3, 5);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // 4. Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // 5. Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x445566, 0.5);
    backLight.position.set(-5, -2, -5);
    scene.add(backLight);

    // 6. Objects
    createSubject();

    // Grid and Axes
    const gridHelper = new THREE.GridHelper(10, 10, 0x334155, 0x1e293b);
    scene.add(gridHelper);

    // axesHelper = new THREE.AxesHelper(2);
    // scene.add(axesHelper);

    // Custom Axes with matching colors
    const axisLength = 2;

    // X Axis (Magenta)
    const ptsX = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(axisLength, 0, 0)];
    const geoX = new THREE.BufferGeometry().setFromPoints(ptsX);
    const matX = new THREE.LineBasicMaterial({ color: 0xff00ff });
    scene.add(new THREE.Line(geoX, matX));

    // Y Axis (Cyan)
    const ptsY = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, axisLength, 0)];
    const geoY = new THREE.BufferGeometry().setFromPoints(ptsY);
    const matY = new THREE.LineBasicMaterial({ color: 0x00ffff });
    scene.add(new THREE.Line(geoY, matY));

    // Z Axis (Lime Green)
    const ptsZ = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, axisLength)];
    const geoZ = new THREE.BufferGeometry().setFromPoints(ptsZ);
    const matZ = new THREE.LineBasicMaterial({ color: 0x76ff03 });
    scene.add(new THREE.Line(geoZ, matZ));

    // 7. Event Listeners
    window.addEventListener('resize', onWindowResize);
    setupUI();

    // Initial display update
    updateVisualisation();

    // 8. Start Loop
    animate();
}

function createSubject() {
    subject = new THREE.Group();

    // Lat/Long Sphere
    // 1. Transparent Surface (High res for smooth silhouette)
    const sphereGeo = new THREE.SphereGeometry(1.5, 64, 32);
    const sphereMat = new THREE.MeshPhongMaterial({
        color: CONFIG.colors.object,
        transparent: true,
        opacity: 0.15, // Lower opacity to make lines pop
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    subject.add(sphere);

    // 2. Custom Smooth Grid Lines
    // Function to create a circle/loop
    function createLoop(radius, axis, count = 64) {
        const points = [];
        for (let i = 0; i <= count; i++) {
            const angle = (i / count) * Math.PI * 2;
            // Basic circle in XZ plane purely for construction
            let x = Math.cos(angle) * radius;
            let z = Math.sin(angle) * radius;
            let y = 0;
            points.push(new THREE.Vector3(x, y, z));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        return geo;
    }

    const lineMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3
    });

    const r = 1.501; // Scale slightly up to avoid Z-fighting
    const loops = new THREE.Group();

    // -- Latitudes (Horizontal circles) --
    const latCount = 18;
    for (let i = 1; i < latCount; i++) {
        const phi = (i / latCount) * Math.PI; // 0..PI
        const y = r * Math.cos(phi);
        const circleR = r * Math.sin(phi);

        // Create circle points in XZ plane
        const points = [];
        const seg = 64;
        for (let j = 0; j <= seg; j++) {
            const theta = (j / seg) * Math.PI * 2;
            points.push(new THREE.Vector3(
                circleR * Math.cos(theta),
                y,
                circleR * Math.sin(theta)
            ));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        loops.add(new THREE.Line(geo, lineMat));
    }

    // -- Longitudes (Vertical circles passing through poles) --
    const longCount = 18; // 12 meridians
    for (let i = 0; i < longCount; i++) {
        const theta = (i / longCount) * Math.PI;

        const points = [];
        const seg = 64;
        for (let j = 0; j <= seg; j++) {
            const alpha = (j / seg) * Math.PI * 2;
            // Vertical circle radius r
            let vx = r * Math.sin(alpha);
            let vy = r * Math.cos(alpha);
            let vz = 0;

            // Rotate around Y
            let rx = vx * Math.cos(theta) - vz * Math.sin(theta);
            let rz = vx * Math.sin(theta) + vz * Math.cos(theta);

            points.push(new THREE.Vector3(rx, vy, rz));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        loops.add(new THREE.Line(geo, lineMat));
    }

    subject.add(loops);

    // 3. Markers for Orientation (Axes)
    // Thinner and more vibrant pointers

    // Geometry for axes (thinner)
    const armGeo = new THREE.CylinderGeometry(0.02, 0.02, 3.5);

    // Geometry for tips (smaller)
    const coneGeo = new THREE.ConeGeometry(0.06, 0.2, 16);

    // Vibrant Colors (CMY)
    // X: Magenta
    const matR = new THREE.MeshStandardMaterial({
        color: 0xff00ff,
        emissive: 0x440044,
        roughness: 0.2,
        metalness: 0.5
    });
    // Y: Cyan
    const matG = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x004444,
        roughness: 0.2,
        metalness: 0.5
    });
    // Z: Lime Green
    const matB = new THREE.MeshStandardMaterial({
        color: 0x76ff03,
        emissive: 0x113300,
        roughness: 0.2,
        metalness: 0.5
    });

    // Red Axis (X)
    const armR = new THREE.Mesh(armGeo, matR);
    armR.rotation.z = Math.PI / 2;
    subject.add(armR);

    // Green Axis (Y)
    const armG = new THREE.Mesh(armGeo, matG);
    subject.add(armG);

    // Blue Axis (Z)
    const armB = new THREE.Mesh(armGeo, matB);
    armB.rotation.x = Math.PI / 2;
    subject.add(armB);

    // X Tip
    const tipX = new THREE.Mesh(coneGeo, matR);
    tipX.position.set(1.75, 0, 0);
    tipX.rotation.z = -Math.PI / 2;
    subject.add(tipX);

    // Y Tip
    const tipY = new THREE.Mesh(coneGeo, matG);
    tipY.position.set(0, 1.75, 0);
    subject.add(tipY);

    // Z Tip
    const tipZ = new THREE.Mesh(coneGeo, matB);
    tipZ.position.set(0, 0, 1.75);
    tipZ.rotation.x = Math.PI / 2;
    subject.add(tipZ);

    scene.add(subject);
}

function setupUI() {
    const inputs = ['axis-x', 'axis-y', 'axis-z'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', updateStateFromUI);
        document.getElementById(id).addEventListener('change', normalizeUIInputs);
    });

    const slider = document.getElementById('angle-slider');
    slider.addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);

        // Snapping logic
        const snapThreshold = 20;
        const snapPoints = [0, 90, 180, 270, 360, 450, 540, 630, 720];

        for (let point of snapPoints) {
            if (Math.abs(val - point) < snapThreshold) {
                val = point;
                break;
            }
        }

        // Trigger animation to new angle
        targetAngle = val;
        if (!isAnimating) {
            isAnimating = true;
        }
    });

    // Update slider position on release (change) to show the snapped value visually if needed
    slider.addEventListener('change', (e) => {
        e.target.value = state.angle;
    });
}

function normalizeUIInputs() {
    const x = parseFloat(document.getElementById('axis-x').value) || 0;
    const y = parseFloat(document.getElementById('axis-y').value) || 0;
    const z = parseFloat(document.getElementById('axis-z').value) || 0;

    let v = new THREE.Vector3(x, y, z);
    if (v.lengthSq() === 0) {
        v.set(0, 1, 0); // fallback
    } else {
        v.normalize();
    }

    // Update fields to normalized values (nice for user to see)
    // Only on 'change' (blur), not 'input' to avoid fighting user typing
    document.getElementById('axis-x').value = v.x.toFixed(2);
    document.getElementById('axis-y').value = v.y.toFixed(2);
    document.getElementById('axis-z').value = v.z.toFixed(2);

    state.axis.copy(v);
    updateVisualisation();
}

function updateStateFromUI() {
    const x = parseFloat(document.getElementById('axis-x').value) || 0;
    const y = parseFloat(document.getElementById('axis-y').value) || 0;
    const z = parseFloat(document.getElementById('axis-z').value) || 0;

    let v = new THREE.Vector3(x, y, z);
    if (v.lengthSq() > 0.0001) {
        v.normalize();
        state.axis.copy(v);
    }
    updateVisualisation();
}

// Exposed globally for buttons
window.setAngle = function (deg) {
    state.angle = deg;
    document.getElementById('angle-slider').value = deg;
    updateVisualisation();
};

window.animateTo = function (deg) {
    if (isAnimating) return;
    targetAngle = deg;
    isAnimating = true;
};

function updateVisualisation() {
    // 1. Calculate Quaternion Q based on Axis and Angle
    // q = [ cos(theta/2), sin(theta/2) * u ]
    const theta = THREE.MathUtils.degToRad(state.angle);
    const halfTheta = theta * 0.5;

    const cosHalf = Math.cos(halfTheta);
    const sinHalf = Math.sin(halfTheta);

    const u = state.axis;
    const qx = sinHalf * u.x;
    const qy = sinHalf * u.y;
    const qz = sinHalf * u.z;
    const qw = cosHalf;

    // 2. Apply to object
    // Note: Three.js Quaternion is (x, y, z, w)
    const q = new THREE.Quaternion(qx, qy, qz, qw);
    subject.setRotationFromQuaternion(q);
    subject.updateMatrix();

    // 3. Update UI Text
    document.getElementById('angle-display').innerText = state.angle.toFixed(0) + "°";

    // Quaternion Display
    const qEl = document.getElementById('quaternion-val');
    // Format -0.00 to 0.00 for cleaner look if needed, but explicit sign is good here
    const fmt = (n) => (n >= 0 ? "+" : "") + n.toFixed(2);

    qEl.innerHTML = `
        w: ${fmt(qw)}<br>
        x: ${fmt(qx)}<br>
        y: ${fmt(qy)}<br>
        z: ${fmt(qz)}
    `;

    // Pauli Matrix Display
    // q = w·I + x·σ₁ + y·σ₂ + z·σ₃
    const pauliEl = document.getElementById('pauli-val');
    const fmtCoeff = (coeff) => {
        if (Math.abs(coeff) < 0.01) return "";
        const sign = coeff >= 0 ? "+" : "-";
        const val = Math.abs(coeff).toFixed(2);
        return `${sign}${val}`;
    };

    let pauliTerms = [];
    if (Math.abs(qw) >= 0.01) pauliTerms.push(`${fmt(qw)}·I`);
    if (Math.abs(qx) >= 0.01) pauliTerms.push(`${fmtCoeff(qx)}·σ₁`);
    if (Math.abs(qy) >= 0.01) pauliTerms.push(`${fmtCoeff(qy)}·σ₂`);
    if (Math.abs(qz) >= 0.01) pauliTerms.push(`${fmtCoeff(qz)}·σ₃`);

    if (pauliTerms.length === 0) {
        pauliEl.textContent = "0";
    } else {
        // Clean up the first term's sign
        let display = pauliTerms.join(" ");
        display = display.replace(/^\+/, ""); // Remove leading +
        pauliEl.textContent = display;
    }

    // Matrix Display
    const mEl = document.getElementById('matrix-val');
    const m = subject.matrix.elements; // Column-major
    // r11 r12 r13
    // r21 r22 r23
    // r31 r32 r33

    // Three.js store:
    // 0  4  8  12
    // 1  5  9  13
    // 2  6  10 14
    // 3  7  11 15

    const r11 = fmt(m[0]), r12 = fmt(m[4]), r13 = fmt(m[8]);
    const r21 = fmt(m[1]), r22 = fmt(m[5]), r23 = fmt(m[9]);
    const r31 = fmt(m[2]), r32 = fmt(m[6]), r33 = fmt(m[10]);

    mEl.innerHTML = `${r11}  ${r12}  ${r13}\n${r21}  ${r22}  ${r23}\n${r31}  ${r32}  ${r33}`;

    // SU(2) Matrix Display
    // Matrix = [ w+zi   x+yi ]
    //          [ -x+yi  w-zi ]
    const su2El = document.getElementById('su2-matrix-val');

    // Helper for complex numbers
    // z = x + iy
    const fmtC = (re, im) => {
        const reS = fmt(re);
        const imS = scale => (Math.abs(scale) < 0.1 ? "0.0" : Math.abs(scale).toFixed(1));
        const sign = im >= 0 ? "+" : "-";
        return `${reS} ${sign} ${imS(im)}i`;
    };

    // Row 1
    const el11 = fmtC(qw, qz);   // w + zi
    const el12 = fmtC(qx, qy);   // x + yi

    // Row 2
    const el21 = fmtC(-qx, qy);  // -x + yi
    const el22 = fmtC(qw, -qz);  // w - zi

    su2El.innerHTML = `${el11}    ${el12}\n${el21}    ${el22}`;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    if (isAnimating) {
        // Improved smoothing with smaller threshold
        const diff = targetAngle - state.angle;
        if (Math.abs(diff) < 0.01) {
            state.angle = targetAngle;
            isAnimating = false;
        } else {
            // Slower decay for smoother settling, or faster? 
            // 0.05 is slow. 0.1 is responsive. 
            // Let's stick to 0.1 for responsiveness but the small threshold prevents the 'snap'
            state.angle += diff * 0.1;
        }
        document.getElementById('angle-slider').value = state.angle;
        updateVisualisation();
    }

    renderer.render(scene, camera);
}
