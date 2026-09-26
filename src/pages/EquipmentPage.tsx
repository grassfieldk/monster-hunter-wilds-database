import { useParams } from 'react-router-dom';
import { ArmorSeriesDetail, EquipmentDetail } from './equipment/EquipmentDetail';
import { EquipmentList } from './equipment/EquipmentList';

export function EquipmentPage() {
  const { kind, id } = useParams();
  return id ? kind === 'armor' ? <ArmorSeriesDetail /> : <EquipmentDetail /> : <EquipmentList />;
}
