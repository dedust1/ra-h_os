"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Edit2, FolderPlus, Plus, Trash2, X } from 'lucide-react';
import type { Node } from '@/types/database';
import ConfirmDialog from '../common/ConfirmDialog';
import InputDialog from '../common/InputDialog';
import LucideIconPicker, { DynamicIcon } from '../common/LucideIconPicker';
import { getNodeIcon } from '@/utils/nodeIcons';
import { useDimensionIcons } from '@/context/DimensionIconsContext';

interface DimensionSummary {
  dimension: string;
  count: number;
  isPriority: boolean;
  description?: string | null;
  icon?: string | null;
}

interface FolderViewOverlayProps {
  onClose: () => void;
  onNodeOpen: (nodeId: number) => void;
  refreshToken: number;
  onDataChanged?: () => void;
  onDimensionSelect?: (dimensionName: string | null) => void;
  replaceWithViewsOnDimensionSelect?: boolean;
  toolbarHost?: HTMLDivElement | null;
}

const PAGE_SIZE = 50;
const CARD_BG = 'var(--rah-bg-card)';
const CARD_TEXT = 'var(--rah-text-primary)';

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'now';

  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;

  return `${Math.floor(months / 12)}y`;
}

export default function FolderViewOverlay({
  onClose,
  onNodeOpen,
  refreshToken,
  onDataChanged,
  onDimensionSelect,
  replaceWithViewsOnDimensionSelect = false,
  toolbarHost,
}: FolderViewOverlayProps) {
  const [view, setView] = useState<'dimensions' | 'nodes'>('dimensions');
  const [dimensions, setDimensions] = useState<DimensionSummary[]>([]);
  const [dimensionsLoading, setDimensionsLoading] = useState(true);
  const [dimensionsError, setDimensionsError] = useState<string | null>(null);
  const [selectedDimension, setSelectedDimension] = useState<DimensionSummary | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [nodesLoading, setNodesLoading] = useState(false);
  const [nodesError, setNodesError] = useState<string | null>(null);
  const [hasMoreNodes, setHasMoreNodes] = useState(false);
  const [nodeOffset, setNodeOffset] = useState(0);
  const [showAddDimensionDialog, setShowAddDimensionDialog] = useState(false);
  const [dimensionPendingDelete, setDimensionPendingDelete] = useState<string | null>(null);
  const [deletingDimension, setDeletingDimension] = useState<string | null>(null);
  const [dragHoverDimension, setDragHoverDimension] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editDescriptionText, setEditDescriptionText] = useState('');

  const [hoveredDimension, setHoveredDimension] = useState<string | null>(null);

  const [editingDimensionModal, setEditingDimensionModal] = useState<DimensionSummary | null>(null);
  const [editModalName, setEditModalName] = useState('');
  const [editModalDescription, setEditModalDescription] = useState('');
  const [editModalIcon, setEditModalIcon] = useState('Folder');
  const [editModalNameError, setEditModalNameError] = useState('');
  const [savingDimensionEdit, setSavingDimensionEdit] = useState(false);

  const draggedNodeRef = useRef<{ id: number; title?: string; dimensions?: string[] } | null>(null);
  const { dimensionIcons, setDimensionIcons } = useDimensionIcons();

  const sortedDimensions = useMemo(
    () => [...dimensions].sort((a, b) => a.dimension.localeCompare(b.dimension)),
    [dimensions],
  );

  useEffect(() => {
    void fetchDimensions();
  }, []);

  useEffect(() => {
    if (view === 'dimensions') {
      void fetchDimensions();
      return;
    }

    if (selectedDimension) {
      void fetchNodes(selectedDimension.dimension, true);
      void fetchDimensions();
    }
  }, [refreshToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDimensions = async () => {
    setDimensionsLoading(true);
    setDimensionsError(null);

    try {
      const response = await fetch('/api/dimensions');
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch dimensions');
      }

      setDimensions(data.data || []);
      setSelectedDimension((current) => {
        if (!current) return current;
        const updated = (data.data || []).find((dim: DimensionSummary) => dim.dimension === current.dimension);
        return updated ?? current;
      });
    } catch (error) {
      console.error('Error fetching dimensions:', error);
      setDimensionsError('Failed to load dimensions');
    } finally {
      setDimensionsLoading(false);
    }
  };

  const fetchNodes = async (dimensionName: string, reset = false) => {
    setNodesLoading(true);
    setNodesError(null);

    try {
      const offset = reset ? 0 : nodeOffset;
      const params = new URLSearchParams({
        dimensions: dimensionName,
        limit: String(PAGE_SIZE),
        offset: String(offset),
        sortBy: 'updated',
      });

      const response = await fetch(`/api/nodes?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch nodes');
      }

      const fetchedNodes: Node[] = data.data || [];
      setNodes((prev) => (reset ? fetchedNodes : [...prev, ...fetchedNodes]));
      setNodeOffset(offset + fetchedNodes.length);
      setHasMoreNodes(fetchedNodes.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching nodes:', error);
      setNodesError('Failed to load nodes');
    } finally {
      setNodesLoading(false);
    }
  };

  const handleSelectDimension = (dimension: DimensionSummary) => {
    if (replaceWithViewsOnDimensionSelect) {
      onDimensionSelect?.(dimension.dimension);
      return;
    }

    setSelectedDimension(dimension);
    setView('nodes');
    setNodes([]);
    setNodeOffset(0);
    setHasMoreNodes(false);
    setEditingDescription(false);
    setEditDescriptionText('');
    onDimensionSelect?.(dimension.dimension);
    void fetchNodes(dimension.dimension, true);
  };

  const handleBackToDimensions = () => {
    setView('dimensions');
    setSelectedDimension(null);
    setNodes([]);
    setNodeOffset(0);
    setHasMoreNodes(false);
    setEditingDescription(false);
    setEditDescriptionText('');
    onDimensionSelect?.(null);
  };

  const handleAddDimension = async (name: string) => {
    if (!name.trim()) return;

    try {
      const response = await fetch('/api/dimensions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create dimension');
      }

      await fetchDimensions();
      onDataChanged?.();
      setShowAddDimensionDialog(false);
    } catch (error) {
      console.error('Error creating dimension:', error);
      alert('Failed to create dimension. Please try again.');
    }
  };

  const handleDeleteDimension = async (dimension: string) => {
    setDeletingDimension(dimension);

    try {
      const response = await fetch(`/api/dimensions?name=${encodeURIComponent(dimension)}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete dimension');
      }

      if (selectedDimension?.dimension === dimension) {
        handleBackToDimensions();
      }

      await fetchDimensions();
      onDataChanged?.();
    } catch (error) {
      console.error('Error deleting dimension:', error);
      alert('Failed to delete dimension. Please try again.');
    } finally {
      setDeletingDimension((current) => (current === dimension ? null : current));
      setDimensionPendingDelete((current) => (current === dimension ? null : current));
    }
  };

  const handleNodeTileDragStart = (event: DragEvent<HTMLButtonElement | HTMLDivElement>, node: Node) => {
    event.dataTransfer.effectAllowed = 'copyMove';
    const nodeData = {
      id: node.id,
      title: node.title || 'Untitled',
      dimensions: node.dimensions || [],
    };

    draggedNodeRef.current = nodeData;
    event.dataTransfer.setData('application/node-info', JSON.stringify(nodeData));
    event.dataTransfer.setData('application/x-rah-node', JSON.stringify({ id: node.id, title: node.title || 'Untitled' }));
    event.dataTransfer.setData('text/plain', `[NODE:${node.id}:"${node.title || 'Untitled'}"]`);

    const preview = document.createElement('div');
    preview.textContent = node.title || `Node #${node.id}`;
    preview.style.position = 'fixed';
    preview.style.top = '-1000px';
    preview.style.left = '-1000px';
    preview.style.padding = '4px 8px';
    preview.style.background = '#0f0f0f';
    preview.style.color = '#f8fafc';
    preview.style.fontSize = '11px';
    preview.style.fontWeight = '600';
    preview.style.borderRadius = '6px';
    preview.style.border = '1px solid #1f1f1f';
    document.body.appendChild(preview);
    event.dataTransfer.setDragImage(preview, 6, 6);

    setTimeout(() => {
      preview.parentNode?.removeChild(preview);
    }, 0);
  };

  const handleNodeTileDragEnd = () => {
    draggedNodeRef.current = null;
  };

  const handleDimensionDragOver = (event: DragEvent<HTMLElement>) => {
    if (event.dataTransfer.types.includes('application/node-info') || event.dataTransfer.types.includes('text/plain')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDimensionDragEnter = (event: DragEvent<HTMLElement>, dimension: string) => {
    if (event.dataTransfer.types.includes('application/node-info') || event.dataTransfer.types.includes('text/plain')) {
      setDragHoverDimension(dimension);
    }
  };

  const handleDimensionDragLeave = (_event: DragEvent<HTMLElement>, dimension: string) => {
    if (dragHoverDimension === dimension) {
      setDragHoverDimension(null);
    }
  };

  const handleNodeDropOnDimension = async (event: DragEvent<HTMLElement>, dimension: string) => {
    event.preventDefault();
    event.stopPropagation();

    let payload: { id: number; dimensions?: string[] } | null = draggedNodeRef.current;

    if (!payload) {
      const raw = event.dataTransfer.getData('application/node-info') || event.dataTransfer.getData('text/plain');
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch (error) {
          console.error('Failed to parse drag data:', error);
        }
      }
    }

    draggedNodeRef.current = null;

    if (!payload?.id) {
      setDragHoverDimension(null);
      return;
    }

    try {
      const currentDimensions = payload.dimensions || [];
      if (currentDimensions.some((dim) => dim.toLowerCase() === dimension.toLowerCase())) {
        setDragHoverDimension(null);
        return;
      }

      const updatedDimensions = Array.from(new Set([...currentDimensions, dimension]));
      const response = await fetch(`/api/nodes/${payload.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dimensions: updatedDimensions }),
      });

      if (!response.ok) {
        throw new Error('Failed to update node dimensions');
      }

      if (selectedDimension?.dimension === dimension) {
        await fetchNodes(dimension, true);
      }

      await fetchDimensions();
      onDataChanged?.();
    } catch (error) {
      console.error('Error assigning node to dimension:', error);
      alert('Failed to add dimension to node. Please try again.');
    } finally {
      setDragHoverDimension(null);
    }
  };

  const startDescriptionEdit = () => {
    if (!selectedDimension) return;
    setEditingDescription(true);
    setEditDescriptionText(selectedDimension.description || '');
  };

  const cancelDescriptionEdit = () => {
    setEditingDescription(false);
    setEditDescriptionText('');
  };

  const saveDescription = async () => {
    if (!selectedDimension) return;

    try {
      const response = await fetch('/api/dimensions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedDimension.dimension,
          description: editDescriptionText.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update description');
      }

      const nextDescription = editDescriptionText.trim();
      setSelectedDimension((current) => (current ? { ...current, description: nextDescription } : null));
      setDimensions((current) =>
        current.map((dimension) =>
          dimension.dimension === selectedDimension.dimension
            ? { ...dimension, description: nextDescription }
            : dimension,
        ),
      );
      setEditingDescription(false);
      setEditDescriptionText('');
      onDataChanged?.();
    } catch (error) {
      console.error('Error updating dimension description:', error);
      alert('Failed to update description. Please try again.');
    }
  };

  const openDimensionEditModal = (dimension: DimensionSummary) => {
    setEditingDimensionModal(dimension);
    setEditModalName(dimension.dimension);
    setEditModalDescription(dimension.description || '');
    setEditModalIcon(dimensionIcons[dimension.dimension] || dimension.icon || 'Folder');
    setEditModalNameError('');
  };

  const closeDimensionEditModal = () => {
    setEditingDimensionModal(null);
    setEditModalName('');
    setEditModalDescription('');
    setEditModalIcon('Folder');
    setEditModalNameError('');
    setSavingDimensionEdit(false);
  };

  const saveDimensionEdit = async () => {
    if (!editingDimensionModal) return;

    const trimmedName = editModalName.trim();
    if (!trimmedName) {
      setEditModalNameError('Name cannot be empty');
      return;
    }

    const duplicate = dimensions.some(
      (dimension) =>
        dimension.dimension.toLowerCase() === trimmedName.toLowerCase()
        && dimension.dimension !== editingDimensionModal.dimension,
    );

    if (duplicate) {
      setEditModalNameError('A dimension with this name already exists');
      return;
    }

    setSavingDimensionEdit(true);

    try {
      const isRenamed = trimmedName !== editingDimensionModal.dimension;
      const response = await fetch('/api/dimensions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isRenamed
            ? {
                currentName: editingDimensionModal.dimension,
                newName: trimmedName,
                description: editModalDescription.trim(),
                icon: editModalIcon,
              }
            : {
                name: editingDimensionModal.dimension,
                description: editModalDescription.trim(),
                icon: editModalIcon,
              },
        ),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update dimension');
      }

      setDimensionIcons((current) => {
        const next = { ...current, [trimmedName]: editModalIcon };
        if (isRenamed) {
          delete next[editingDimensionModal.dimension];
        }
        return next;
      });

      if (selectedDimension?.dimension === editingDimensionModal.dimension) {
        const nextDimension = {
          ...selectedDimension,
          dimension: trimmedName,
          description: editModalDescription.trim(),
          icon: editModalIcon,
        };
        setSelectedDimension(nextDimension);
        onDimensionSelect?.(trimmedName);
      }

      await fetchDimensions();
      onDataChanged?.();
      closeDimensionEditModal();
    } catch (error) {
      console.error('Error saving dimension edit:', error);
      alert('Failed to save dimension. Please try again.');
      setSavingDimensionEdit(false);
    }
  };

  const renderDimensionCard = (dimension: DimensionSummary) => {
    const isDragTarget = dragHoverDimension === dimension.dimension;
    const isHovered = hoveredDimension === dimension.dimension;
    const iconName = dimensionIcons[dimension.dimension] || dimension.icon || 'Folder';
    const hasCustomIcon = iconName !== 'Folder';

    return (
      <button
        key={dimension.dimension}
        type="button"
        onClick={() => handleSelectDimension(dimension)}
        onMouseEnter={() => setHoveredDimension(dimension.dimension)}
        onMouseLeave={() => setHoveredDimension(null)}
        onDragOver={handleDimensionDragOver}
        onDragEnter={(event) => handleDimensionDragEnter(event, dimension.dimension)}
        onDragLeave={(event) => handleDimensionDragLeave(event, dimension.dimension)}
        onDrop={(event) => handleNodeDropOnDimension(event, dimension.dimension)}
        style={{
          minHeight: '80px',
          borderRadius: '14px',
          border: `1px solid ${isDragTarget ? 'var(--rah-accent-green)' : isHovered ? 'var(--rah-border-strong)' : 'var(--rah-border)'}`,
          background: isDragTarget
            ? 'color-mix(in srgb, var(--rah-accent-green) 8%, var(--rah-bg-folder))'
            : 'var(--rah-bg-folder)',
          padding: '0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          textAlign: 'left',
          cursor: 'pointer',
          transition: 'border-color 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease',
          opacity: isHovered ? 0.85 : 1,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
          position: 'relative',
        }}
      >
        {/* Hover actions */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            display: 'flex',
            gap: '4px',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.15s ease',
            zIndex: 1,
          }}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openDimensionEditModal(dimension);
            }}
            title="Edit dimension"
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              border: '1px solid var(--rah-border)',
              background: 'var(--rah-bg-panel)',
              color: 'var(--rah-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Edit2 size={12} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setDimensionPendingDelete(dimension.dimension);
            }}
            title="Delete dimension"
            disabled={deletingDimension === dimension.dimension}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              border: '1px solid var(--rah-border)',
              background: 'var(--rah-bg-panel)',
              color: 'var(--rah-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: deletingDimension === dimension.dimension ? 'not-allowed' : 'pointer',
              opacity: deletingDimension === dimension.dimension ? 0.35 : 1,
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>

        {/* Body — empty dark space */}
        <div style={{ flex: 1 }} />

        {/* Footer */}
        <div
          style={{
            padding: '8px 10px 9px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <DynamicIcon
                name={iconName}
                size={14}
                style={{
                  color: isDragTarget ? 'var(--rah-accent-green)' : 'var(--rah-text-base)',
                  opacity: isDragTarget ? 1 : 0.65,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--rah-text-base)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {dimension.dimension}
              </span>
            </div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--rah-text-inverse)',
                background: 'var(--rah-accent-green)',
                padding: '1px 6px',
                borderRadius: '999px',
                flexShrink: 0,
                lineHeight: 1.6,
              }}
            >
              {dimension.count > 0 ? dimension.count : 'New'}
            </span>
          </div>
          {dimension.description?.trim() && (
            <span
              style={{
                fontSize: '11px',
                color: 'var(--rah-text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {dimension.description.trim()}
            </span>
          )}
        </div>
      </button>
    );
  };

  const renderNewDimensionCard = () => (
    <button
      key="new-dimension-card"
      type="button"
      onClick={() => setShowAddDimensionDialog(true)}
      style={{
        minHeight: '80px',
        borderRadius: '14px',
        border: '1px dashed var(--rah-border-strong)',
        background: 'var(--rah-bg-folder)',
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease, opacity 0.15s ease',
        opacity: 0.6,
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.opacity = '1';
        event.currentTarget.style.borderColor = 'var(--rah-border-stronger)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.opacity = '0.6';
        event.currentTarget.style.borderColor = 'var(--rah-border-strong)';
      }}
    >
      <div style={{ flex: 1 }} />

      <div
        style={{
          padding: '8px 10px 9px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FolderPlus size={14} style={{ color: 'var(--rah-text-muted)', opacity: 0.65, flexShrink: 0 }} />
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--rah-text-muted)' }}>
            New Dimension
          </span>
        </div>
        <Plus size={13} style={{ color: 'var(--rah-text-muted)', flexShrink: 0 }} />
      </div>
    </button>
  );

  const renderDimensionGrid = () => {
    if (dimensionsLoading) {
      return (
        <div style={{ padding: '32px 24px', color: 'var(--rah-text-muted)' }}>
          Loading dimensions...
        </div>
      );
    }

    if (dimensionsError) {
      return (
        <div style={{ padding: '32px 24px', color: '#ef4444' }}>
          {dimensionsError}
        </div>
      );
    }

    return (
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '16px',
          alignContent: 'start',
        }}
      >
        {renderNewDimensionCard()}
        {sortedDimensions.map(renderDimensionCard)}
      </div>
    );
  };

  const renderNodeGrid = () => {
    if (!selectedDimension) return null;

    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '20px 24px 12px',
            borderBottom: '1px solid var(--rah-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={handleBackToDimensions}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              alignSelf: 'flex-start',
              padding: '0',
              background: 'transparent',
              border: 'none',
              color: 'var(--rah-text-muted)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={14} />
            {selectedDimension.dimension}
          </button>

          {editingDescription ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '720px' }}>
              <textarea
                value={editDescriptionText}
                onChange={(event) => setEditDescriptionText(event.target.value)}
                placeholder="Add a short description for this dimension..."
                maxLength={500}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  background: 'var(--rah-bg-subtle)',
                  border: '1px solid var(--rah-border)',
                  borderRadius: '10px',
                  color: 'var(--rah-text-primary)',
                  fontSize: '13px',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={saveDescription}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--rah-border-strong)',
                    background: 'var(--rah-bg-card)',
                    color: 'var(--rah-text-primary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Save description
                </button>
                <button
                  type="button"
                  onClick={cancelDescriptionEdit}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--rah-border)',
                    background: 'transparent',
                    color: 'var(--rah-text-muted)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={startDescriptionEdit}
              style={{
                padding: '0',
                border: 'none',
                background: 'transparent',
                color: selectedDimension.description ? 'var(--rah-text-muted)' : 'var(--rah-text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left',
                lineHeight: 1.5,
                maxWidth: '720px',
              }}
            >
              {selectedDimension.description?.trim() || '+ Add description'}
            </button>
          )}
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '20px 24px 24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: '16px',
            alignContent: 'start',
          }}
        >
          {nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              draggable
              onDragStart={(event) => handleNodeTileDragStart(event, node)}
              onDragEnd={handleNodeTileDragEnd}
              onClick={() => {
                onNodeOpen(node.id);
                onClose();
              }}
              style={{
                minHeight: '180px',
                borderRadius: '16px',
                border: '1px solid var(--rah-border)',
                background: 'var(--rah-bg-card)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'transform 0.16s ease, border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.transform = 'translateY(-2px)';
                event.currentTarget.style.background = 'var(--rah-bg-hover)';
                event.currentTarget.style.borderColor = 'var(--rah-border-strong)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform = 'translateY(0)';
                event.currentTarget.style.background = 'var(--rah-bg-card)';
                event.currentTarget.style.borderColor = 'var(--rah-border)';
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'var(--rah-bg-subtle)',
                  border: '1px solid var(--rah-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {getNodeIcon(node, dimensionIcons, 20)}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--rah-text-primary)',
                    lineHeight: 1.4,
                    minHeight: '40px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {node.title || 'Untitled'}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--rah-text-muted)' }}>
                  {formatRelativeTime(node.updated_at || node.created_at)}
                </div>
              </div>
            </button>
          ))}

          {!nodesLoading && nodes.length === 0 && (
            <div
              style={{
                gridColumn: '1 / -1',
                minHeight: '220px',
                borderRadius: '16px',
                border: '1px dashed var(--rah-border-strong)',
                background: 'var(--rah-bg-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                textAlign: 'center',
                color: 'var(--rah-text-muted)',
                fontSize: '14px',
              }}
            >
              No nodes in this dimension yet.
            </div>
          )}

          {nodesError && (
            <div style={{ gridColumn: '1 / -1', color: '#ef4444', fontSize: '13px' }}>
              {nodesError}
            </div>
          )}

          {nodesLoading && (
            <div style={{ gridColumn: '1 / -1', color: 'var(--rah-text-muted)', fontSize: '13px' }}>
              Loading nodes...
            </div>
          )}
        </div>

        {hasMoreNodes && (
          <div
            style={{
              padding: '0 24px 24px',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => void fetchNodes(selectedDimension.dimension, false)}
              disabled={nodesLoading}
              style={{
                padding: '10px 16px',
                borderRadius: '999px',
                border: '1px solid var(--rah-border-strong)',
                background: 'var(--rah-bg-card)',
                color: 'var(--rah-text-primary)',
                cursor: nodesLoading ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {nodesLoading ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const toolbar = (
    <div
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        minWidth: 0,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--rah-text-primary)' }}>
          {view === 'dimensions' ? 'Dimensions' : selectedDimension?.dimension}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--rah-text-muted)', marginTop: '2px' }}>
          {view === 'dimensions'
            ? `${sortedDimensions.length} ${sortedDimensions.length === 1 ? 'dimension' : 'dimensions'}`
            : `${nodes.length} loaded`}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {view === 'dimensions' && (
          <button
            type="button"
            onClick={() => setShowAddDimensionDialog(true)}
            title="Add dimension"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              border: '1px solid var(--rah-border)',
              background: 'var(--rah-bg-subtle)',
              color: 'var(--rah-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
          </button>
        )}

        {!toolbarHost && (
          <button
            type="button"
            onClick={onClose}
            title="Close"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              border: '1px solid var(--rah-border)',
              background: 'var(--rah-bg-subtle)',
              color: 'var(--rah-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'transparent',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {toolbarHost
          ? createPortal(toolbar, toolbarHost)
          : (
            <div style={{ borderBottom: '1px solid var(--rah-border)', padding: '12px 16px' }}>
              {toolbar}
            </div>
            )}

        {view === 'nodes' ? renderNodeGrid() : renderDimensionGrid()}
      </div>

      <ConfirmDialog
        open={dimensionPendingDelete !== null}
        title="Delete this dimension?"
        message={`This will remove "${dimensionPendingDelete ?? ''}" from every node.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (dimensionPendingDelete) {
            void handleDeleteDimension(dimensionPendingDelete);
          }
        }}
        onCancel={() => setDimensionPendingDelete(null)}
      />

      <InputDialog
        open={showAddDimensionDialog}
        title="Add New Dimension"
        message="Enter a name for the new dimension:"
        placeholder="e.g. Research, Work, Ideas"
        confirmLabel="Create"
        onConfirm={(value) => {
          void handleAddDimension(value);
        }}
        onCancel={() => setShowAddDimensionDialog(false)}
      />

      {editingDimensionModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDimensionEditModal();
          }}
        >
          <div
            style={{
              background: 'var(--rah-bg-card)',
              border: '1px solid var(--rah-border)',
              borderRadius: '16px',
              width: '480px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--rah-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'var(--rah-bg-subtle)',
                    border: '1px solid var(--rah-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <DynamicIcon name={editModalIcon} size={18} style={{ color: 'var(--rah-text-muted)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--rah-text-primary)' }}>
                    Edit Dimension
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--rah-text-muted)' }}>
                    {editingDimensionModal.dimension}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={closeDimensionEditModal}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  border: '1px solid var(--rah-border)',
                  background: 'var(--rah-bg-subtle)',
                  color: 'var(--rah-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                padding: '20px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--rah-text-muted)',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Name
                </label>
                <input
                  type="text"
                  value={editModalName}
                  onChange={(event) => {
                    setEditModalName(event.target.value);
                    setEditModalNameError('');
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--rah-bg-subtle)',
                    border: `1px solid ${editModalNameError ? '#ef4444' : 'var(--rah-border)'}`,
                    borderRadius: '10px',
                    color: 'var(--rah-text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                {editModalNameError && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#ef4444' }}>
                    {editModalNameError}
                  </div>
                )}
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--rah-text-muted)',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Description
                </label>
                <textarea
                  value={editModalDescription}
                  onChange={(event) => setEditModalDescription(event.target.value)}
                  placeholder="Describe what this dimension is for..."
                  maxLength={500}
                  style={{
                    width: '100%',
                    minHeight: '88px',
                    padding: '12px',
                    background: 'var(--rah-bg-subtle)',
                    border: '1px solid var(--rah-border)',
                    borderRadius: '10px',
                    color: 'var(--rah-text-primary)',
                    fontSize: '13px',
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />
                <div
                  style={{
                    marginTop: '6px',
                    fontSize: '11px',
                    color: 'var(--rah-text-muted)',
                    textAlign: 'right',
                  }}
                >
                  {editModalDescription.length}/500
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--rah-text-muted)',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Icon
                </label>
                <LucideIconPicker selectedIcon={editModalIcon} onSelect={setEditModalIcon} />
              </div>
            </div>

            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid var(--rah-border)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
              }}
            >
              <button
                type="button"
                onClick={closeDimensionEditModal}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid var(--rah-border)',
                  borderRadius: '8px',
                  color: 'var(--rah-text-muted)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveDimensionEdit()}
                disabled={savingDimensionEdit}
                style={{
                  padding: '8px 16px',
                  background: 'var(--rah-bg-hover)',
                  border: '1px solid var(--rah-border-strong)',
                  borderRadius: '8px',
                  color: 'var(--rah-text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: savingDimensionEdit ? 'not-allowed' : 'pointer',
                  opacity: savingDimensionEdit ? 0.6 : 1,
                }}
              >
                {savingDimensionEdit ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
