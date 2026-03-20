"use client";

import { useState } from 'react';
import FolderViewOverlay from '@/components/nodes/FolderViewOverlay';
import PaneHeader from './PaneHeader';
import { DimensionsPaneProps, PaneType } from './types';

export default function DimensionsPane({
  slot,
  isActive,
  onPaneAction,
  onCollapse,
  onSwapPanes,
  tabBar,
  onNodeOpen,
  refreshToken,
  onDataChanged,
  onDimensionSelect,
}: DimensionsPaneProps) {
  const [toolbarHost, setToolbarHost] = useState<HTMLDivElement | null>(null);
  const handleTypeChange = (type: PaneType) => {
    onPaneAction?.({ type: 'switch-pane-type', paneType: type });
  };

  // When used as a pane, "close" means switch back to node view
  const handleClose = () => {
    onPaneAction?.({ type: 'switch-pane-type', paneType: 'node' });
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'transparent',
      overflow: 'hidden',
    }}>
      <PaneHeader
        slot={slot}
        onCollapse={onCollapse}
        onSwapPanes={onSwapPanes}
        tabBar={tabBar}
        toolbarHostRef={setToolbarHost}
      />

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        {/* FolderViewOverlay expects to be an overlay, so we wrap it in a container */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'transparent',
        }}>
          <FolderViewOverlay
            onClose={handleClose}
            onNodeOpen={onNodeOpen}
            refreshToken={refreshToken}
            onDataChanged={onDataChanged}
            onDimensionSelect={onDimensionSelect}
            replaceWithViewsOnDimensionSelect={true}
            toolbarHost={toolbarHost}
          />
        </div>
      </div>
    </div>
  );
}
