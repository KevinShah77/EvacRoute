import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown, MapPin } from 'lucide-react';
import { useEvacuation } from '../../hooks/useEvacuation';
import * as api from '../../services/api';

export default function LocationSearch() {
  const {
    graph,
    startNode,
    targetNode,
    accessibleOnly,
    setStartLocation,
    setActiveFloor,
    calculateRoute,
    showToast,
  } = useEvacuation();

  const [roomInput, setRoomInput] = useState('');
  const [roomError, setRoomError] = useState(null);
  const [isSearchingRoom, setIsSearchingRoom] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Sync searchQuery with current startNode label/id
  useEffect(() => {
    if (!isOpen) {
      const current = graph.nodes.find((n) => n.id === startNode);
      if (current) {
        setSearchQuery(`${current.label} (${current.floor})`);
      } else if (startNode) {
        setSearchQuery(startNode);
      }
    }
  }, [startNode, graph.nodes, isOpen]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFindRoom = async () => {
    const trimmed = roomInput.trim();
    if (!trimmed) {
      setRoomError('Please enter a room number.');
      return;
    }

    setIsSearchingRoom(true);
    setRoomError(null);

    let foundNode = null;
    try {
      const res = await api.resolveRoom(trimmed);
      if (res?.data?.room) {
        foundNode = res.data.room;
      }
    } catch (err) {
      // Backend returned 404 or network issue; fallback to client graph data
    }

    if (!foundNode && graph.nodes) {
      const cleaned = trimmed.toLowerCase();
      const cleanedNoPrefix = cleaned.replace(/^(?:room|rm|no)\b\.?\s*|^#\s*/i, '').trim();
      const normRaw = cleaned.replace(/[\s\-_]+/g, '');
      const normNoPrefix = cleanedNoPrefix.replace(/[\s\-_]+/g, '');

      const roomNodes = graph.nodes.filter(
        (n) => n.type === 'classroom' || n.type === 'room'
      );

      // 1. Exact node ID match (e.g. 'GF-001', 'gf001', 'f1113')
      foundNode = roomNodes.find((n) => {
        const nidLower = n.id.toLowerCase();
        const nidNorm = nidLower.replace(/[\s\-_]+/g, '');
        return (
          nidLower === cleaned ||
          nidLower === cleanedNoPrefix ||
          nidNorm === normRaw ||
          nidNorm === normNoPrefix
        );
      });

      // 2. Room number match (e.g. '201', '001', '1', 'Room 201')
      if (!foundNode) {
        const digitMatches = (cleanedNoPrefix || cleaned).match(/\d+/g);
        if (digitMatches) {
          const targetNumStr = digitMatches[digitMatches.length - 1];
          const targetNumInt = parseInt(targetNumStr, 10);
          const matching = roomNodes.filter((n) => {
            const m = (n.label || '').match(/\((\d+)\)/);
            if (!m) return false;
            return m[1] === targetNumStr || parseInt(m[1], 10) === targetNumInt;
          });
          if (matching.length === 1) {
            foundNode = matching[0];
          }
        }
      }

      // 3. Unique room title match (ignoring parenthesized room number, e.g. "Physics Lab")
      if (!foundNode) {
        const matchingTitles = roomNodes.filter((n) => {
          const title = (n.label || '').replace(/\s*\(\d+\)\s*/g, '').trim().toLowerCase();
          return title === cleaned || title === cleanedNoPrefix;
        });
        if (matchingTitles.length === 1) {
          foundNode = matchingTitles[0];
        }
      }
    }

    setIsSearchingRoom(false);

    if (foundNode) {
      setRoomError(null);
      setStartLocation(foundNode);
      if (foundNode.floor) {
        setActiveFloor(foundNode.floor);
      }
      if (showToast) {
        showToast(`Selected ${foundNode.label} (${foundNode.floor})`);
      }
      await calculateRoute(foundNode.id, targetNode, accessibleOnly, true);
    } else {
      setRoomError(`Room "${trimmed}" was not found in building graph.`);
    }
  };

  const selectableNodes = graph.nodes.filter(
    (n) => !(accessibleOnly && n.type === 'staircase')
  );

  const filteredNodes = selectableNodes.filter((node) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const idMatch = node.id.toLowerCase().includes(query);
    const labelMatch = (node.label || '').toLowerCase().includes(query);
    const floorMatch = (node.floor || '').toLowerCase().includes(query);
    const typeMatch = (node.type || '').toLowerCase().includes(query);
    return idMatch || labelMatch || floorMatch || typeMatch;
  });

  return (
    <div className="space-y-3">
      {/* 1. Dedicated Room Number Input Field */}
      <div>
        <label
          htmlFor="room-number-input"
          className="block text-xs text-slate-300 mb-1 font-medium"
        >
          Enter Room Number
        </label>
        <div className="flex gap-1.5">
          <input
            id="room-number-input"
            type="text"
            className="flex-1 min-w-0 bg-slate-700 px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm text-white placeholder-slate-400 transition"
            placeholder="Enter room number (e.g. 101)"
            value={roomInput}
            onChange={(e) => {
              setRoomInput(e.target.value);
              if (roomError) setRoomError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleFindRoom();
              }
            }}
          />
          <button
            type="button"
            onClick={handleFindRoom}
            disabled={isSearchingRoom}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow"
            title="Find room and calculate route"
          >
            <Search size={14} />
            <span>{isSearchingRoom ? 'Finding...' : 'Find Room'}</span>
          </button>
        </div>
        {roomError && (
          <p className="text-red-400 text-xs mt-1.5 font-medium flex items-center gap-1">
            <span>⚠</span>
            <span>{roomError}</span>
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center pt-1">
        <div className="border-t border-slate-700 w-full" />
        <span className="bg-slate-800 px-2 text-[10px] text-slate-400 uppercase font-semibold">
          or browse location
        </span>
      </div>

      {/* 2. Location Search & Selector Dropdown */}
      <div>
        <label className="block text-xs text-slate-300 mb-1 font-medium">
          Current Location
        </label>
        <div ref={containerRef} className="relative">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              className="w-full bg-slate-700 pl-8 pr-16 py-2.5 rounded-lg border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm text-white placeholder-slate-400 transition"
              placeholder="Search room (e.g. 201, Physics)..."
              value={searchQuery}
              onFocus={() => setIsOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
            />
            <div className="absolute right-2 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsOpen(true);
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-600 transition"
                  title="Clear"
                >
                  <X size={12} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-600 transition"
                title="Toggle dropdown"
              >
                <ChevronDown
                  size={14}
                  className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
          </div>

          {isOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-slate-800 border border-slate-600 rounded-lg shadow-2xl py-1 divide-y divide-slate-700/50">
              {filteredNodes.length === 0 ? (
                <div className="px-3 py-3 text-xs text-slate-400 text-center">
                  No matching rooms or locations found.
                </div>
              ) : (
                filteredNodes.map((node) => {
                  const isSelected = node.id === startNode;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700 transition ${
                        isSelected
                          ? 'bg-blue-600/30 text-blue-200 font-semibold'
                          : 'text-slate-200'
                      }`}
                      onClick={() => {
                        setStartLocation(node);
                        if (node.floor) {
                          setActiveFloor(node.floor);
                        }
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="truncate font-medium">{node.label}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span>ID: {node.id}</span>
                          <span>•</span>
                          <span className="capitalize">{node.type}</span>
                        </span>
                      </div>
                      <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-slate-700 border border-slate-600 text-slate-300">
                        {node.floor}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
          <MapPin size={10} className="text-blue-400" />
          <span>Or click any room on the map to relocate.</span>
        </p>
      </div>
    </div>
  );
}
