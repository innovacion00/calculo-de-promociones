'use client';

import type { GoogleBusinessReview } from '../../types/googleBusiness';

interface Props {
  reviews: GoogleBusinessReview[];
  loading: boolean;
  error?: string | null;
}

const STAR_LABELS: Record<string, string> = {
  ONE: '★☆☆☆☆', TWO: '★★☆☆☆', THREE: '★★★☆☆', FOUR: '★★★★☆', FIVE: '★★★★★',
};

export default function GoogleBusinessReviewsTable({ reviews, loading, error }: Props) {
  if (loading) return <div className="gbp-table-loading">Cargando reseñas...</div>;
  if (error) return <div className="gbp-error-msg">{error}</div>;
  if (reviews.length === 0) return (
    <div className="gbp-empty-msg">No se encontraron reseñas para esta ubicación.</div>
  );

  return (
    <div className="gbp-table-wrapper">
      <table className="gbp-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Hotel / Ubicación</th>
            <th>Usuario</th>
            <th>Calificación</th>
            <th>Comentario</th>
            <th>Respuesta</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {reviews.map(r => (
            <tr key={r.reviewId}>
              <td>{new Date(r.createTime).toLocaleDateString('es-MX')}</td>
              <td>{r.locationName}</td>
              <td>{r.isAnonymous ? 'Anónimo' : r.reviewerName}</td>
              <td className={`gbp-rating gbp-rating-${r.ratingNumeric}`}>
                {STAR_LABELS[r.rating] ?? r.rating} <span>({r.ratingNumeric}/5)</span>
              </td>
              <td className="gbp-comment">{r.comment ?? <em>Sin comentario</em>}</td>
              <td className="gbp-reply">{r.reviewReply ? r.reviewReply.comment : <em>Sin respuesta</em>}</td>
              <td>
                <span className={`gbp-status-badge ${r.reviewReply ? 'responded' : 'pending'}`}>
                  {r.reviewReply ? 'Respondida' : 'Pendiente'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
