import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ObjectPreset, ChartDataPoint, ModalType } from './types';
import { GRAVITY, AIR_DENSITY, OBJECT_PRESETS, INITIAL_OBJECT, INITIAL_HEIGHT } from './constants';

// --- HELPER COMPONENTS & ICONS ---

const BasketballIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="Basketball icon">
        <defs>
            <radialGradient id="basketballShine" cx="0.35" cy="0.35" r="0.65">
                <stop offset="0%" stopColor="#FFC977" />
                <stop offset="100%" stopColor="#E07C00" />
            </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#basketballShine)" />
        <path d="M50,2 C50,2 40,50 50,98" stroke="black" strokeWidth="2.5" fill="none"/>
        <path d="M2,50 C2,50 50,60 98,50" stroke="black" strokeWidth="2.5" fill="none"/>
        <path d="M15,20 C40,45 60,45 85,20" stroke="black" strokeWidth="2.5" fill="none"/>
        <path d="M15,80 C40,55 60,55 85,80" stroke="black" strokeWidth="2.5" fill="none"/>
    </svg>
);

const TennisBallIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="Tennis ball icon">
        <defs>
            <radialGradient id="tennisShine" cx="0.35" cy="0.35" r="0.65">
                <stop offset="0%" stopColor="#E8FF5B" />
                <stop offset="100%" stopColor="#C3D92A" />
            </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#tennisShine)" />
        <path d="M15,20 C40,45 60,45 85,20" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="8" strokeLinecap="round"/>
        <path d="M15,80 C40,55 60,55 85,80" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="8" strokeLinecap="round"/>
    </svg>
);

const BowlingBallIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="Bowling ball icon">
        <defs>
            <radialGradient id="bowlingShine" cx="0.35" cy="0.35" r="0.6">
                <stop offset="0%" stopColor="#333" />
                <stop offset="100%" stopColor="#0a0a0a" />
            </radialGradient>
            <radialGradient id="bowlingHighlight" cx="0.4" cy="0.4" r="0.5">
                <stop offset="0%" stopColor="rgba(200, 200, 200, 0.4)" />
                <stop offset="50%" stopColor="rgba(200, 200, 200, 0)" />
            </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bowlingShine)" />
        <circle cx="50" cy="50" r="48" fill="url(#bowlingHighlight)" />
        <circle cx="40" cy="35" r="5" fill="#000" />
        <circle cx="60" cy="35" r="5" fill="#000" />
        <circle cx="50" cy="50" r="5" fill="#000" />
    </svg>
);

const ICONS: Record<string, React.FC<{className?: string}>> = {
    'Basketball': BasketballIcon,
    'Tennis ball': TennisBallIcon,
    'Bowling ball': BowlingBallIcon,
};

const AirFlowIcon: React.FC<{ velocity: number }> = ({ velocity }) => {
    const intensity = Math.min(1, velocity / 50);
    if (intensity < 0.1) return null;

    const lineStyle: React.CSSProperties = {
        stroke: `rgba(135, 206, 235, ${0.3 + intensity * 0.4})`, // Light Sky Blue
        strokeWidth: 2 + intensity,
        strokeDasharray: '10 10',
        animation: `flow ${Math.max(0.1, 1 / intensity)}s linear infinite`,
    };

    return (
        <>
            <style>
                {`@keyframes flow { to { stroke-dashoffset: -20; } }`}
            </style>
            <svg width="100" height="100" viewBox="0 0 100 100" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 overflow-visible opacity-80">
                <path d="M20 0 C 30 30, 30 70, 20 100" fill="none" style={lineStyle} />
                <path d="M80 0 C 70 30, 70 70, 80 100" fill="none" style={lineStyle} />
            </svg>
        </>
    );
};

const HeightRuler: React.FC<{ maxHeight: number }> = ({ maxHeight }) => {
    const markers = [];
    const step = maxHeight > 500 ? 100 : maxHeight > 200 ? 50 : maxHeight > 50 ? 25 : 10;
    const numMarkers = Math.floor(maxHeight / step);

    for (let i = 0; i <= numMarkers; i++) {
        const h = i * step;
        const percentage = (h / maxHeight) * 100;
        markers.push(
            <div key={h} className="absolute right-full text-right pr-2 text-xs text-gray-500 w-10" style={{ bottom: `${percentage}%`, transform: 'translateY(50%)' }}>
                {h}m
            </div>
        );
    }

    return <div className="absolute top-0 bottom-0 right-2 h-full">{markers}</div>;
};

// --- MODAL COMPONENT ---
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 id="modal-title" className="text-xl font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl font-bold" aria-label="Close modal">&times;</button>
                </div>
                <div className="p-6 text-gray-300 leading-relaxed max-h-[70vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

// --- SLIDER COMPONENT ---
interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
}
const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, unit, onChange, disabled }) => (
    <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center text-sm font-medium text-gray-400">
            <label htmlFor={`${label}-slider`}>{label}</label>
            <span className="text-sky-400 font-mono">{value.toFixed(2)} {unit}</span>
        </div>
        <input
            id={`${label}-slider`} type="range" min={min} max={max} step={step} value={value}
            onChange={onChange} disabled={disabled}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed accent-sky-500"
        />
    </div>
);

// --- PERFORMANCE HELPER ---
const downsampleData = (data: ChartDataPoint[], threshold = 1500, factor = 2): ChartDataPoint[] => {
    if (data.length < threshold) return data;
    const downsampled = [];
    for (let i = 0; i < data.length; i += factor) {
        if (i + factor <= data.length) {
            let timeSum = 0;
            let velocitySum = 0;
            for(let j=0; j<factor; j++) {
                timeSum += data[i+j].time;
                velocitySum += data[i+j].velocity;
            }
            downsampled.push({ time: timeSum / factor, velocity: velocitySum / factor });
        } else {
           downsampled.push(data[i]);
        }
    }
    return downsampled;
};


// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
    const [isRunning, setIsRunning] = useState(false);
    
    // Params
    const [dragCoefficient, setDragCoefficient] = useState(INITIAL_OBJECT.cd);
    const [mass, setMass] = useState(INITIAL_OBJECT.mass);
    const [diameter, setDiameter] = useState(INITIAL_OBJECT.diameter);
    const [selectedObjectName, setSelectedObjectName] = useState(INITIAL_OBJECT.name);
    const [startHeight, setStartHeight] = useState(INITIAL_HEIGHT);
    
    // Physics State
    const [time, setTime] = useState(0);
    const [height, setHeight] = useState(startHeight);
    const [velocity, setVelocity] = useState(0);
    const [acceleration, setAcceleration] = useState(0);
    const [forceOfGravity, setForceOfGravity] = useState(0);
    const [dragForce, setDragForce] = useState(0);

    // UI State
    const [animationSpeed, setAnimationSpeed] = useState(1);
    const [chartData, setChartData] = useState<ChartDataPoint[]>([{ time: 0, velocity: 0 }]);
    const [activeModal, setActiveModal] = useState<ModalType>(ModalType.NONE);

    const animationFrameId = useRef<number | null>(null);
    const lastUpdateTime = useRef<number | null>(null);

    const resetSimulation = useCallback(() => {
        setIsRunning(false);
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
        lastUpdateTime.current = null;

        const currentPreset = OBJECT_PRESETS.find(p => p.name === selectedObjectName) || INITIAL_OBJECT;
        setMass(currentPreset.mass);
        setDragCoefficient(currentPreset.cd);
        setDiameter(currentPreset.diameter);

        setTime(0);
        setHeight(startHeight);
        setVelocity(0);
        setAcceleration(0);
        setForceOfGravity(0);
        setDragForce(0);
        setChartData([{ time: 0, velocity: 0 }]);
    }, [selectedObjectName, startHeight]);
    
    // This effect runs when the user changes the object preset or start height from the controls
    useEffect(() => {
        resetSimulation();
    }, [selectedObjectName, startHeight, resetSimulation]);


    const runSimulation = useCallback((timestamp: number) => {
        if (lastUpdateTime.current === null) {
            lastUpdateTime.current = timestamp;
            animationFrameId.current = requestAnimationFrame(runSimulation);
            return;
        }

        const elapsedSeconds = (timestamp - lastUpdateTime.current) / 1000;
        const dt = elapsedSeconds * animationSpeed;

        setHeight(prevHeight => {
            if (prevHeight <= 0) {
                setIsRunning(false);
                return 0;
            }
            
            const currentArea = Math.PI * Math.pow(diameter / 2, 2);
            const currentFg = mass * GRAVITY;
            const currentFd = 0.5 * AIR_DENSITY * Math.pow(velocity, 2) * dragCoefficient * currentArea;
            const netForce = currentFg - currentFd;
            const currentAcc = netForce / mass;
            const newVelocity = velocity + currentAcc * dt;
            const newHeight = prevHeight - newVelocity * dt;
            const newTime = time + dt;
            
            setTime(newTime);
            setVelocity(newVelocity);
            setAcceleration(currentAcc);
            setForceOfGravity(currentFg);
            setDragForce(currentFd);

            setChartData(prevData => {
                const newData = [...prevData, { time: newTime, velocity: newVelocity }];
                return downsampleData(newData);
            });

            return newHeight > 0 ? newHeight : 0;
        });

        lastUpdateTime.current = timestamp;
        animationFrameId.current = requestAnimationFrame(runSimulation);
    }, [animationSpeed, mass, dragCoefficient, diameter, velocity, time]);


    useEffect(() => {
        if (isRunning) {
            lastUpdateTime.current = null;
            animationFrameId.current = requestAnimationFrame(runSimulation);
        } else if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
        return () => {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, [isRunning, runSimulation]);

    const ballPosition = ((startHeight - height) / startHeight) * 100;
    const ObjectIcon = ICONS[selectedObjectName] || BasketballIcon;

    return (
        <div className="min-h-screen font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-screen-2xl mx-auto bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-2xl p-6">
                
                {/* Header */}
                <header className="flex flex-wrap justify-between items-center pb-4 border-b border-gray-700">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">Drag Force Simulation</h1>
                    <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                        <button onClick={() => setActiveModal(ModalType.DIRECTIONS)} className="px-4 py-2 bg-gray-700 text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-sky-400">Directions</button>
                        <button onClick={() => setActiveModal(ModalType.DETAILS)} className="px-4 py-2 bg-gray-700 text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-sky-400">Details</button>
                        <button onClick={() => setActiveModal(ModalType.ABOUT)} className="px-4 py-2 bg-gray-700 text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-sky-400">About</button>
                    </div>
                </header>

                <main className="pt-6 grid grid-cols-1 xl:grid-cols-12 gap-6">

                    {/* Left Column: Controls & Status */}
                    <div className="xl:col-span-3 flex flex-col space-y-6">
                        {/* Control Panel */}
                        <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-700/80">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <button onClick={() => setIsRunning(!isRunning)} className={`py-2 text-lg font-bold text-white rounded-lg shadow-lg transition-transform transform hover:scale-105 ${isRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}`}>{isRunning ? 'Pause' : 'Start'}</button>
                                <button onClick={resetSimulation} className="py-2 text-lg font-bold text-white bg-red-600 rounded-lg shadow-lg hover:bg-red-700 transition-transform transform hover:scale-105">Reset</button>
                            </div>
                            <div className="space-y-5">
                                <select value={selectedObjectName} onChange={(e) => setSelectedObjectName(e.target.value)} disabled={isRunning} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500">
                                    {OBJECT_PRESETS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                                </select>
                               <Slider label="Height" value={startHeight} min={10} max={1000} step={1} unit="m" onChange={(e) => setStartHeight(parseFloat(e.target.value))} disabled={isRunning}/>
                               <Slider label="Drag Coefficient" value={dragCoefficient} min={0} max={2} step={0.01} unit="" onChange={(e) => setDragCoefficient(parseFloat(e.target.value))} disabled={isRunning}/>
                               <Slider label="Mass" value={mass} min={0.01} max={10} step={0.01} unit="kg" onChange={(e) => setMass(parseFloat(e.target.value))} disabled={isRunning}/>
                               <Slider label="Diameter" value={diameter} min={0.01} max={1} step={0.01} unit="m" onChange={(e) => setDiameter(parseFloat(e.target.value))} disabled={isRunning}/>
                            </div>
                        </div>
                        {/* Status Display */}
                        <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-700/80">
                           <ul className="font-mono text-gray-300 grid grid-cols-1 gap-2">
                                <li className="flex justify-between"><span>Gravitational Force:</span> <span className="font-semibold text-white">{forceOfGravity.toFixed(2)} N</span></li>
                                <li className="flex justify-between"><span>Drag Force:</span> <span className="font-semibold text-white">{dragForce.toFixed(2)} N</span></li>
                                <li className="flex justify-between"><span>Velocity:</span> <span className="font-semibold text-white">{velocity.toFixed(2)} m/s</span></li>
                                <li className="flex justify-between"><span>Height:</span> <span className="font-semibold text-white">{height.toFixed(2)} m</span></li>
                                <li className="flex justify-between"><span>Acceleration:</span> <span className="font-semibold text-white">{acceleration.toFixed(2)} m/s²</span></li>
                           </ul>
                        </div>
                         {/* Animation Speed Control */}
                        <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-700/80">
                            <Slider label="Animation Speed" value={animationSpeed} min={0.1} max={5} step={0.1} unit="x" onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))} />
                        </div>
                    </div>
                    
                    {/* Middle Column: Animation */}
                    <div className="xl:col-span-3 bg-gray-900/50 p-4 rounded-xl border border-gray-700/80">
                       <div className="relative w-full h-[650px] bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 rounded-md overflow-hidden shadow-inner">
                         <HeightRuler maxHeight={startHeight} />
                         <div className="absolute" style={{ top: `${ballPosition}%`, left: '50%', transform: 'translateX(-50%)' }}>
                           <div className="relative w-10 h-10" style={{ filter: `blur(${Math.min(1.5, velocity / 60)}px)` }}>
                             <AirFlowIcon velocity={velocity}/>
                             <ObjectIcon className="w-full h-full drop-shadow-lg"/>
                           </div>
                         </div>
                       </div>
                    </div>

                    {/* Right Column: Chart */}
                    <div className="xl:col-span-6 bg-gray-900/50 p-4 rounded-xl border border-gray-700/80 min-h-[400px] xl:min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                <XAxis dataKey="time" type="number" domain={['auto', 'auto']} tickFormatter={(tick) => tick.toFixed(1)} tick={{ fill: '#a0aec0' }} axisLine={{ stroke: '#4A5568' }} tickLine={{ stroke: '#4A5568' }} label={{ value: 'Time (s)', position: 'insideBottom', offset: -15, fill: '#a0aec0' }} />
                                <YAxis tickFormatter={(tick) => tick.toFixed(0)} tick={{ fill: '#a0aec0' }} axisLine={{ stroke: '#4A5568' }} tickLine={{ stroke: '#4A5568' }} label={{ value: 'Velocity (m/s)', angle: -90, position: 'insideLeft', offset: 0, fill: '#a0aec0' }} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', borderColor: 'rgba(255, 255, 255, 0.2)', color: '#cbd5e1' }} formatter={(value: number) => [`${value.toFixed(2)} m/s`, 'Velocity']} labelFormatter={(label: number) => `Time: ${label.toFixed(2)}s`} />
                                <Line type="monotone" dataKey="velocity" stroke="#0ea5e9" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </main>
            </div>

            {/* Modals */}
             <Modal isOpen={activeModal === ModalType.DIRECTIONS} onClose={() => setActiveModal(ModalType.NONE)} title="Directions">
                <p>This simulation models an object falling from a specific height, subject to gravity and air resistance (drag).</p>
                <ul className="list-disc list-inside mt-4 space-y-2">
                    <li>Use the <strong className="text-sky-400">Start / Pause</strong> button to control the simulation.</li>
                    <li>The <strong className="text-sky-400">Reset</strong> button returns the object to the top and clears the graph. It also resets sliders to the selected preset's values.</li>
                    <li>Adjust the sliders for <strong className="text-sky-400">Height</strong>, <strong className="text-sky-400">Drag Coefficient</strong>, <strong className="text-sky-400">Mass</strong>, and <strong className="text-sky-400">Diameter</strong> to see how they affect the fall.</li>
                    <li>To restore the original parameters for an object, simply re-select it from the dropdown menu.</li>
                    <li>Observe the real-time data and the Velocity vs. Time graph.</li>
                </ul>
            </Modal>
            <Modal isOpen={activeModal === ModalType.DETAILS} onClose={() => setActiveModal(ModalType.NONE)} title="Physics Details">
                <p>The motion of the falling object is determined by the net force acting upon it, according to Newton's Second Law (F=ma).</p>
                <div className="mt-4 space-y-4">
                    <div>
                        <h3 className="font-semibold text-white">1. Force of Gravity (Fg):</h3>
                        <p className="ml-4">The constant downward force due to Earth's gravity. It is calculated as: <code className="bg-gray-700 p-1 rounded">Fg = mass × g</code>, where <code className="bg-gray-700 p-1 rounded">g = 9.8 m/s²</code>.</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">2. Drag Force (Fd):</h3>
                        <p className="ml-4">The upward force of air resistance, which increases with velocity. It is calculated using the drag equation: <code className="bg-gray-700 p-1 rounded">Fd = 0.5 × ρ × v² × Cd × A</code>, where:</p>
                        <ul className="list-disc list-inside ml-8 mt-2">
                            <li><code className="bg-gray-700 p-1 rounded">ρ</code> is the density of air (~1.225 kg/m³).</li>
                            <li><code className="bg-gray-700 p-1 rounded">v</code> is the object's instantaneous velocity.</li>
                            <li><code className="bg-gray-700 p-1 rounded">Cd</code> is the drag coefficient.</li>
                            <li><code className="bg-gray-700 p-1 rounded">A</code> is the cross-sectional area: <code className="bg-gray-700 p-1 rounded">A = π × (diameter/2)²</code>.</li>
                        </ul>
                    </div>
                     <div>
                        <h3 className="font-semibold text-white">3. Net Force & Acceleration:</h3>
                        <p className="ml-4">The net force is <code className="bg-gray-700 p-1 rounded">F_net = Fg - Fd</code>. The object's acceleration is then <code className="bg-gray-700 p-1 rounded">a = F_net / mass</code>. As velocity increases, drag force increases, causing acceleration to decrease. When Fg equals Fd, acceleration becomes zero, and the object reaches <strong>terminal velocity</strong>.</p>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={activeModal === ModalType.ABOUT} onClose={() => setActiveModal(ModalType.NONE)} title="About">
                <p>This interactive physics simulation was built with React, TypeScript, and Tailwind CSS.</p>
                <p className="mt-2">It demonstrates how modern web technologies can create functional and aesthetically pleasing educational tools.</p>
            </Modal>
        </div>
    );
};

export default App;