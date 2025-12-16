import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, X, Download, BarChart3, Home, Upload, RefreshCw, Wifi, WifiOff, Trash, User2Icon } from 'lucide-react';
import io from 'socket.io-client';
import config, { loadConfig } from './config';

const DEFAULT_DEPARTMENTS = [
  'MT100', 'MT200', 'MT300', 'MT400', 
  'MT600', 'MT700', 'MT800', 'MT900', 'SGA'
];

// These will be set after config is loaded
let API_URL = config.API_URL;
let SOCKET_URL = config.SOCKET_URL;

export default function App() {
  // Initialize config when component mounts
  useEffect(() => {
    const initConfig = async () => {
      try {
        const loadedConfig = await loadConfig();
        API_URL = loadedConfig.API_URL || config.API_URL;
        SOCKET_URL = loadedConfig.SOCKET_URL || config.SOCKET_URL;
      } catch (error) {
        console.error('Error loading config:', error);
      }
    };
    
    initConfig();
  }, []);
  const [currentPage, setCurrentPage] = useState('voting');
  const [showPopup, setShowPopup] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');
  const [votes, setVotes] = useState([]);
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);

  // เชื่อมต่อ Socket.IO
  useEffect(() => {
    // โหลดรายชื่อแผนกจาก localStorage
    const savedDepts = JSON.parse(localStorage.getItem('departments') || 'null');
    if (savedDepts) {
      setDepartments(savedDepts);
    }

    // เชื่อมต่อ Socket
    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    setSocket(newSocket);

    // Event: เชื่อมต่อสำเร็จ
    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setIsConnected(true);
      setSaveStatus('🟢 เชื่อมต่อสำเร็จ');
      setTimeout(() => setSaveStatus(''), 2000);
    });

    // Event: ขาดการเชื่อมต่อ
    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
      setSaveStatus('🔴 ขาดการเชื่อมต่อ');
    });

    // Event: รับข้อมูลโหวต (ทั้งเริ่มต้นและอัปเดต)
    newSocket.on('votes_updated', (updatedVotes) => {
      console.log('📊 Received votes:', updatedVotes.length);
      setVotes(updatedVotes || []);
    });

    // Event: ข้อมูลถูกล้าง
    newSocket.on('votes_cleared', () => {
      console.log('🗑️ Votes cleared');
      setVotes([]);
      setSaveStatus('ข้อมูลถูกล้างแล้ว');
      setTimeout(() => setSaveStatus(''), 2000);
    });

    // Event: รายชื่อแผนกอัปเดต (จาก client อื่น)
    newSocket.on('departments_updated', (updatedDepts) => {
      console.log('🏢 Departments updated:', updatedDepts);
      setDepartments(updatedDepts);
      localStorage.setItem('departments', JSON.stringify(updatedDepts));
      setSaveStatus('✨ รายชื่อแผนกอัปเดต!');
      setTimeout(() => setSaveStatus(''), 2000);
    });

    // Cleanup
    return () => {
      newSocket.close();
    };
  }, []);

  const handleDeptClick = (dept) => {
    setSelectedDept(dept);
    setShowPopup(true);
  };

  const handleVote = async (voteType) => {
    const newVote = {
      department: selectedDept,
      vote: voteType,
      timestamp: new Date().toISOString()
    };
  
    console.log(`${API_URL}/votes`);
    console.log(newVote);
    setLoading(true);
  
    try {
      // Fallback: ใช้ HTTP API ถ้า Socket ไม่ได้เชื่อมต่อ
      const response = await fetch(`${API_URL}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVote)
      });

      if (response.ok) {
        setVotes([...votes, newVote]);
        setSaveStatus('✓ บันทึกสำเร็จ (HTTP)');
        setTimeout(() => setSaveStatus(''), 2000);
      } else {
        setSaveStatus('✗ บันทึกล้มเหลว');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    } catch (error) {
      console.error('Error:', error);
      setSaveStatus('✗ เกิดข้อผิดพลาด');
      setTimeout(() => setSaveStatus(''), 3000);
    } finally {
      // Always reset loading state and close popup
      setLoading(false);
      setShowPopup(false);
      setSelectedDept('');
    }
  };

  const downloadAsCSV = async () => {
    try {
      const response = await fetch(`${API_URL}/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `department_votes_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        setSaveStatus('✓ ดาวน์โหลดสำเร็จ');
        setTimeout(() => setSaveStatus(''), 2000);
      }
    } catch (error) {
      console.error('Error:', error);
      setSaveStatus('✗ ดาวน์โหลดล้มเหลว');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  // create funtion clear all votes to /api/votes/clear with method POST
  const clearAllVotes = async () => {
    // Add confirmation dialog
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบข้อมูลโหวตทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      return;
    }
  
    try {
      const response = await fetch(`${API_URL}/votes/clear`, {
        method: 'POST'
      });
      if (response.ok) {
        setVotes([]);
        setSaveStatus('✓ ล้างข้อมูลสำเร็จ');
        setTimeout(() => setSaveStatus(''), 2000);
      } else {
        setSaveStatus('✗ ล้างข้อมูลล้มเหลว');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    } catch (error) {
      console.error('Error clearing votes:', error);
      setSaveStatus('✗ เกิดข้อผิดพลาด');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = async (e) => {
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
          // Update local state first
          setDepartments(deptList);
          localStorage.setItem('departments', JSON.stringify(deptList));
          
          // Call API to upload departments
          try {
            const response = await fetch(`${API_URL}/departments/upload`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ departments: deptList })
            });
  
            if (response.ok) {
              const result = await response.json();
              setSaveStatus(`✓ ${result.message || `โหลด ${deptList.length} แผนกสำเร็จ!`}`);
              setTimeout(() => setSaveStatus(''), 2000);
            } else {
              setSaveStatus('✗ อัปโหลดแผนกล้มเหลว');
              setTimeout(() => setSaveStatus(''), 3000);
            }
          } catch (apiError) {
            console.error('API Error:', apiError);
            setSaveStatus('⚠️ โหลดแผนกสำเร็จ แต่ไม่สามารถซิงค์กับเซิร์ฟเวอร์');
            setTimeout(() => setSaveStatus(''), 3000);
          }
        } else {
          alert('รูปแบบไฟล์ไม่ถูกต้อง');
        }
      } catch (error) {
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const downloadDepartmentTemplate = () => {
    const template = { departments: DEFAULT_DEPARTMENTS };
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'departments.json';
    a.click();
  };

  const getStats = () => {
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
  };

  const stats = getStats();

  const VotingPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <h1 className="text-4xl font-bold text-gray-800">
              Department Feedback System
            </h1>
            {isConnected ? (
              <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                <Wifi size={14} />
                <span>Real-time</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                <WifiOff size={14} />
                <span>Offline</span>
              </div>
            )}
          </div>
          <p className="text-gray-600">เลือก Department เพื่อให้ความคิดเห็น</p>
          {/* {saveStatus && (
            <p className="mt-2 text-sm font-medium text-indigo-600">{saveStatus}</p>
          )} */}
        </div>

        {/* <div className="flex flex-wrap justify-center gap-3 mb-8">
          <button
            onClick={() => setCurrentPage('results')}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
          >
            <BarChart3 size={20} />
            ดูผลลัพธ์
          </button>

          <label className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg cursor-pointer">
            <Upload size={20} />
            โหลดรายชื่อแผนก
            <input
              type="file"
              accept=".txt,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={downloadDepartmentTemplate}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-lg text-sm"
          >
            ดาวน์โหลดไฟล์ตัวอย่าง
          </button>
        </div> */}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => handleDeptClick(dept)}
              disabled={loading}
              className="bg-white hover:bg-indigo-50 text-gray-800 font-semibold py-8 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-2 border-indigo-200 hover:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-2xl mb-2">{dept}</div>
              {stats[dept]?.total > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">
                  <User2Icon className="w-4 h-4" />
                  <span>{stats[dept].total} โหวต</span>
                </div>
              )}
            </button>
          ))}
        </div>
        <div className="mt-8 text-center">
          {saveStatus && (
            <p className="mt-2 text-sm font-medium text-indigo-600">{saveStatus}</p>
          )}
        </div>
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            โหวตทั้งหมด: <span className="font-bold text-indigo-600">{votes.length}</span>
            {isConnected && <span className="ml-2 text-green-600">● Live</span>}
          </p>
        </div>
        <br></br>
        <hr></hr>
        <br></br>
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <button
            onClick={() => setCurrentPage('results')}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
          >
            <BarChart3 size={20} />
            ดูผลลัพธ์
          </button>

          <label className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg cursor-pointer">
            <Upload size={20} />
            โหลดรายชื่อแผนก
            <input
              type="file"
              accept=".txt,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={downloadDepartmentTemplate}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-lg text-sm"
          >
            ดาวน์โหลดไฟล์ตัวอย่าง
          </button>
        </div>
      </div>
    </div>
  );

  const ResultsPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-4xl font-bold text-gray-800">
              📊 ผลลัพธ์การโหวต
            </h1>
            {isConnected && (
              <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                <Wifi size={14} />
                <span>Live</span>
              </div>
            )}
          </div>
          <p className="text-gray-600">สรุปความคิดเห็นทั้งหมด (อัปเดตอัตโนมัติ)</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <button
            onClick={() => setCurrentPage('voting')}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
          >
            <Home size={20} />
            กลับหน้าหลัก
          </button>

          {votes.length > 0 && (
            <button
              onClick={downloadAsCSV}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg"
            >
              <Download size={20} />
              ดาวน์โหลด CSV
            </button>
          )}
          <button
            onClick={clearAllVotes}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg"
          >
            <Trash size={20} />
            ลบข้อมูลโหวตทั้งหมด
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4">
              <div className="text-3xl font-bold text-indigo-600">{votes.length}</div>
              <div className="text-gray-600">โหวตทั้งหมด</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-green-600">
                {votes.filter(v => v.vote === 'Like').length}
              </div>
              <div className="text-gray-600">👍 Like</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-red-600">
                {votes.filter(v => v.vote === 'Dislike').length}
              </div>
              <div className="text-gray-600">👎 Dislike</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">รายละเอียดแต่ละแผนก</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map(dept => (
              <div key={dept} className="border-2 border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                <h3 className="font-bold text-xl text-gray-700 mb-3">{dept}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-green-600">
                      <ThumbsUp size={18} />
                      Like
                    </span>
                    <span className="font-bold text-xl">{stats[dept]?.likes || 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${stats[dept]?.total > 0 ? (stats[dept].likes / stats[dept].total) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-red-600">
                      <ThumbsDown size={18} />
                      Dislike
                    </span>
                    <span className="font-bold text-xl">{stats[dept]?.dislikes || 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${stats[dept]?.total > 0 ? (stats[dept].dislikes / stats[dept].total) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <div className="pt-2 border-t border-gray-200 text-center">
                    <span className="text-sm text-gray-600">
                      ทั้งหมด: <span className="font-bold">{stats[dept]?.total || 0}</span> โหวต
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {currentPage === 'voting' ? <VotingPage /> : <ResultsPage />}

      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative animate-scale">
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <X size={24} />
            </button>

            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                {selectedDept}
              </h2>
              <p className="text-gray-600 mb-8">
                คุณต้องการให้ความคิดเห็นอย่างไร?
              </p>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => handleVote('Like')}
                  disabled={loading}
                  className="flex flex-col items-center gap-3 px-8 py-6 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ThumbsUp size={48} />
                  <span className="font-bold text-xl">{loading ? 'กำลังบันทึก...' : 'Like'}</span>
                </button>

                <button
                  onClick={() => handleVote('Dislike')}
                  disabled={loading}
                  className="flex flex-col items-center gap-3 px-8 py-6 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ThumbsDown size={48} />
                  <span className="font-bold text-xl">{loading ? 'กำลังบันทึก...' : 'Dislike'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </>
  );
}