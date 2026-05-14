import { useState } from 'react';
import VideoCard from './VideoCard.jsx';
import AudioCard from './AudioCard.jsx';
import ImageCard from './ImageCard.jsx';
import TextCard from './TextCard.jsx';
import PdfCard from './PdfCard.jsx';

export default function MediaCard({ item, isActive, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="media-card" data-index={index}>
      <div className="media-content">
        {item.type === 'video'  && <VideoCard item={item} isActive={isActive} />}
        {item.type === 'audio'  && <AudioCard item={item} isActive={isActive} />}
        {item.type === 'image'  && <ImageCard item={item} />}
        {item.type === 'text'   && <TextCard item={item} isActive={isActive} />}
        {item.type === 'pdf'    && <PdfCard  item={item} isActive={isActive} />}
      </div>

      {item.type !== 'text' && (
        <div className={`card-overlay${expanded ? ' card-overlay--expanded' : ''}`}>
          <div className="card-meta">
            <span className="category-badge">{item.categoryLabel}</span>
            <h2 className="card-title">{item.title}</h2>
            {item.description && (
              <div
                className={`card-description${expanded ? ' card-description--expanded' : ''}`}
                onClick={() => setExpanded(e => !e)}
              >
                <div dangerouslySetInnerHTML={{ __html: item.description }} />
                {!expanded && <span className="card-description-more"> more</span>}
              </div>
            )}
            <a
              className="card-source-link"
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on UbuWeb ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
