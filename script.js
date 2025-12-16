// ข้อมูล Default Departments
const DEFAULT_DEPARTMENTS = [
    'MT100', 'MT200', 'MT300', 'MT400',
    'MT600', 'MT700', 'MT800', 'MT900', 'SGA'
];

// Get API and Socket URLs from config
const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:3000/api';
const SOCKET_URL = window.APP_CONFIG?.SOCKET_URL || 'http://localhost:3000';

// Initialize Socket.IO connection
const socket = io(SOCKET_URL);

// State Management
let currentPage = 'voting';
let departments = [...DEFAULT_DEPARTMENTS];
let votes = [];
let selectedDept = '';
let loading = false;

// Initialize App
function init() {
    loadData();
    render();
    
    // ตั้งค่า Event Listeners
    document.addEventListener('click', (e) => {
        if (e.target.id === 'toggleView') {
            switchPage(currentPage === 'voting' ? 'results' : 'voting');
        } else if (e.target.id === 'downloadCsvBtn') {
            downloadCSV();
        } else if (e.target.id === 'downloadTemplateBtn') {
            downloadTemplate();
        } else if (e.target.classList.contains('vote-btn')) {
            openVoteModal(e.target.dataset.dept);
        } else if (e.target.id === 'closeModal') {
            closeModal();
        } else if (e.target.classList.contains('modal')) {
            closeModalOnOverlay(e);
        } else if (e.target.classList.contains('vote-yes')) {
            submitVote('yes');
        } else if (e.target.classList.contains('vote-no')) {
            submitVote('no');
        } else if (e.target.id === 'fileInput') {
            e.target.click();
        }
    });

    // ตั้งค่า Event Listener สำหรับการอัปโหลดไฟล์
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
    
    // ตั้งค่า WebSocket listeners
    setupWebSocket();
}

// ตั้งค่า WebSocket
function setupWebSocket() {
    // รับข้อมูล real-time เมื่อมีการอัปเดต
    socket.on('votes_updated', (updatedVotes) => {
        votes = updatedVotes;
        render();
        setStatus('อัปเดตผลโหวตล่าสุด!', 'success');
    });
    
    // ตรวจสอบการเชื่อมต่อ
    socket.on('connect', () => {
        console.log('Connected to WebSocket server');
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
    });
}

// Load Data
function loadData() {
    const savedDepts = localStorage.getItem('departments');
    if (savedDepts) {
        departments = JSON.parse(savedDepts);
    }
    loadVotesFromServer();
}

// โหลดข้อมูลจาก Server
async function loadVotesFromServer() {
    loading = true;
    setStatus('กำลังโหลด...');
    render();
    
    try {
        const response = await fetch(`${API_URL}/votes`);
        if (response.ok) {
            const data = await response.json();
            votes = data.votes || [];
            setStatus('✓ โหลดข้อมูลสำเร็จ');
        } else {
            setStatus('⚠ ไม่สามารถโหลดข้อมูลได้');
        }
    } catch (error) {
        console.error('Error:', error);
        setStatus('✗ เกิดข้อผิดพลาด: ตรวจสอบว่า Server ทำงานอยู่');
    }
    
    loading = false;
    render();
    setTimeout(() => setStatus(''), 3000);
}

// บันทึกข้อมูลไป Server
async function saveVoteToServer(vote) {
    try {
        const response = await fetch(`${API_URL}/votes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vote)
        });

        if (response.ok) {
            setStatus('✓ บันทึกสำเร็จ');
            setTimeout(() => setStatus(''), 2000);
            return true;
        } else {
            setStatus('✗ บันทึกล้มเหลว');
            setTimeout(() => setStatus(''), 3000);
            return false;
        }
    } catch (error) {
        console.error('Error:', error);
        setStatus('✗ เกิดข้อผิดพลาด: ตรวจสอบว่า Server ทำงานอยู่');
        setTimeout(() => setStatus(''), 3000);
        return false;
    }
}

// แสดงสถานะ
function setStatus(message) {
    const statusEl = document.querySelector('.status-message');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

// สลับหน้า
function switchPage(page) {
    currentPage = page;
    render();
}

// เปิด Modal
function openVoteModal(dept) {
    selectedDept = dept;
    const app = document.getElementById('app');
    app.insertAdjacentHTML('beforeend', renderModal());
    lucide.createIcons();
}

// ปิด Modal
function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
    selectedDept = '';
}

// ปิด Modal เมื่อคลิกข้างนอก
function closeModalOnOverlay(event) {
    if (event.target.classList.contains('modal-overlay')) {
        closeModal();
    }
}

// บันทึกโหวต
function submitVote(voteType) {
    if (!selectedDept) return;
    
    const vote = {
        department: selectedDept,
        vote: voteType,
        timestamp: new Date().toISOString()
    };
    
    saveVoteToServer(vote);
    
    // ปิด Modal หลังจากโหวต
    closeModal();
    
    // ไม่ต้องโหลดข้อมูลใหม่ เพราะจะอัปเดตผ่าน WebSocket
}

// อัปโหลดไฟล์ Department
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            let deptList;

            if (file.name.endsWith('.json')) {
                const jsonData = JSON.parse(content);
                deptList = jsonData.departments || jsonData;
            } else {
                deptList = content.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);
            }

            if (Array.isArray(deptList) && deptList.length > 0) {
                departments = deptList;
                localStorage.setItem('departments', JSON.stringify(deptList));
                alert(`โหลด ${deptList.length} แผนกสำเร็จ!`);
                render();
            } else {
                alert('รูปแบบไฟล์ไม่ถูกต้อง');
            }
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// ดาวน์โหลดไฟล์ตัวอย่าง
function downloadTemplate() {
    const template = { departments: DEFAULT_DEPARTMENTS };
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'departments.json';
    a.click();
}

// ดาวน์โหลด CSV
async function downloadCSV() {
    try {
        const response = await fetch(`${API_URL}/export`);
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `department_votes_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            setStatus('✓ ดาวน์โหลดสำเร็จ');
            setTimeout(() => setStatus(''), 2000);
        }
    } catch (error) {
        console.error('Error:', error);
        setStatus('✗ ดาวน์โหลดล้มเหลว');
        setTimeout(() => setStatus(''), 3000);
    }
}

// คำนวณสถิติ
function getStats() {
    const stats = {};
    departments.forEach(dept => {
        const deptVotes = votes.filter(v => v.department === dept);
        stats[dept] = {
            likes: deptVotes.filter(v => v.vote === 'Like').length,
            dislikes: deptVotes.filter(v => v.vote === 'Dislike').length,
            total: deptVotes.length
        };
    });
    return stats;
}

// Render หน้าหลัก
function render() {
    const app = document.getElementById('app');
    app.innerHTML = currentPage === 'voting' ? renderVotingPage() : renderResultsPage();
    lucide.createIcons();
}

// Render หน้าโหวต
function renderVotingPage() {
    const stats = getStats();
    return `
        <div class="voting-page">
            <div class="container">
                <div class="header">
                    <h1>MTD00 Open-House feedback</h1>
                    <p>เลือก Department เพื่อให้ความคิดเห็น <a href="./admin.html" class="">Admin</a></p>
                </div>

                <div class="dept-grid">
                    ${departments.map(dept => `
                        <button class="dept-btn" onclick="openVoteModal('${dept}')" ${loading ? 'disabled' : ''}>
                            <div class="dept-name">${dept}</div>
                            ${stats[dept]?.total > 0 ? `
                                <div class="dept-stats">
                                    <i data-lucide="users" style="width: 16px; height: 16px; color: #3b82f6;"></i>
                                    ${stats[dept]?.total || 0} โหวต
                                </div>
                            ` : ''}
                        </button>
                    `).join('')}
                </div>

                <div class="vote-summary">
                    <i data-lucide="users" style="width: 16px; height: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;"></i>
                    โหวตทั้งหมด: <span class="vote-count">${votes.length}</span>
                    <p class="status-message"></p>
                </div>
            </div>
        </div>
    `;
}

// Render หน้าผลลัพธ์
function renderResultsPage() {
    const stats = getStats();
    const totalLikes = votes.filter(v => v.vote === 'Like').length;
    const totalDislikes = votes.filter(v => v.vote === 'Dislike').length;

    return `
        <div class="results-page">
            <div class="container">
                <div class="header">
                    <h1>📊 ผลลัพธ์การโหวต</h1>
                    <p>สรุปความคิดเห็นทั้งหมด</p>
                </div>

                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="switchPage('voting')">
                        <i data-lucide="home"></i>
                        กลับหน้าหลัก
                    </button>
                    ${votes.length > 0 ? `
                        <button class="btn btn-success" onclick="downloadCSV()">
                            <i data-lucide="download"></i>
                            ดาวน์โหลด CSV
                        </button>
                    ` : ''}
                </div>

                <div class="stats-card">
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value indigo">${votes.length}</div>
                            <div class="stat-label">โหวตทั้งหมด</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value green">${totalLikes}</div>
                            <div class="stat-label">👍 Like</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value red">${totalDislikes}</div>
                            <div class="stat-label">👎 Dislike</div>
                        </div>
                    </div>
                </div>

                <div class="stats-card">
                    <h2 class="results-title">รายละเอียดแต่ละแผนก</h2>
                    <div class="results-grid">
                        ${departments.map(dept => {
                            const deptStats = stats[dept] || { likes: 0, dislikes: 0, total: 0 };
                            const likePercent = deptStats.total > 0 ? (deptStats.likes / deptStats.total * 100) : 0;
                            const dislikePercent = deptStats.total > 0 ? (deptStats.dislikes / deptStats.total * 100) : 0;

                            return `
                                <div class="result-card">
                                    <h3 class="result-dept-name">${dept}</h3>
                                    <div class="vote-row">
                                        <span class="vote-label like">
                                            <i data-lucide="thumbs-up"></i>
                                            Like
                                        </span>
                                        <span class="vote-value">${deptStats.likes}</span>
                                    </div>
                                    <div class="progress-bar">
                                        <div class="progress-fill green" style="width: ${likePercent}%"></div>
                                    </div>
                                    <div class="vote-row">
                                        <span class="vote-label dislike">
                                            <i data-lucide="thumbs-down"></i>
                                            Dislike
                                        </span>
                                        <span class="vote-value">${deptStats.dislikes}</span>
                                    </div>
                                    <div class="progress-bar">
                                        <div class="progress-fill red" style="width: ${dislikePercent}%"></div>
                                    </div>
                                    <div class="vote-total">
                                        ทั้งหมด: <span class="vote-total-value">${deptStats.total}</span> โหวต
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render Modal
function renderModal() {
    return `
        <div class="modal-overlay" onclick="closeModalOnOverlay(event)">
            <div class="modal">
                <button class="modal-close" onclick="closeModal()" ${loading ? 'disabled' : ''}>
                    <i data-lucide="x" style="width: 24px; height: 24px;"></i>
                </button>
                <div class="modal-content">
                    <h2 class="modal-title">${selectedDept}</h2>
                    <p class="modal-subtitle">คุณต้องการให้ความคิดเห็นอย่างไร?</p>
                    <div class="modal-buttons">
                        <button class="vote-btn like" onclick="submitVote('Like')" ${loading ? 'disabled' : ''}>
                            <i data-lucide="thumbs-up" style="width: 48px; height: 48px;"></i>
                            <span class="vote-btn-text">${loading ? 'กำลังบันทึก...' : 'Like'}</span>
                        </button>
                        <button class="vote-btn dislike" onclick="submitVote('Dislike')" ${loading ? 'disabled' : ''}>
                            <i data-lucide="thumbs-down" style="width: 48px; height: 48px;"></i>
                            <span class="vote-btn-text">${loading ? 'กำลังบันทึก...' : 'Dislike'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Initialize เมื่อโหลดหน้าเว็บ
window.addEventListener('DOMContentLoaded', init);