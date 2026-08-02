import PricingSettings from '../models/PricingSettings.js';
import City from '../models/City.js';

// Get all pricing settings
export const getAllPricingSettings = async (req, res) => {
  try {
    const pricingSettings = await PricingSettings.find().populate('cityId', 'name');
    res.json({ pricingSettings });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pricing settings', error: error.message });
  }
};

// Get pricing settings by city ID
export const getPricingByCity = async (req, res) => {
  try {
    const { cityId } = req.params;
    let pricing = await PricingSettings.findOne({ cityId });

    // If no pricing settings exist for this city, create default settings
    if (!pricing) {
      const city = await City.findById(cityId);
      if (! city) {
        return res.status(404).json({ message: 'City not found' });
      }

      pricing = new PricingSettings({
        cityId: city._id,
        cityName: city.name,
        basePricePerKm: 2.00,
        weightFeePerKg: 0.50,
        sizeSmallFee: 0,
        sizeMediumFee: 1,
        sizeLargeFee: 2,
        minDistance: 1,
        maxDistance: 50,
        baseDeliveryFee: 5,
        commissionPercentage: 10,
        minBalanceThreshold: 50
      });
      await pricing.save();
    }

    res.json({ pricing });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pricing settings', error: error.message });
  }
};

// Create or update pricing settings for a city
export const upsertPricingSettings = async (req, res) => {
  try {
    const { cityId } = req.params;
    const {
      basePricePerKm,
      weightFeePerKg,
      sizeSmallFee,
      sizeMediumFee,
      sizeLargeFee,
      minDistance,
      maxDistance,
      baseDeliveryFee,
      commissionPercentage,
      minBalanceThreshold
    } = req.body;

    const city = await City.findById(cityId);
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }

    const pricing = await PricingSettings.findOneAndUpdate(
      { cityId },
      {
        cityId,
        cityName: city.name,
        basePricePerKm,
        weightFeePerKg,
        sizeSmallFee,
        sizeMediumFee,
        sizeLargeFee,
        minDistance,
        maxDistance,
        baseDeliveryFee,
        commissionPercentage,
        minBalanceThreshold
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ pricing, message: 'Pricing settings updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating pricing settings', error: error.message });
  }
};

// Delete pricing settings for a city
export const deletePricingSettings = async (req, res) => {
  try {
    const { cityId } = req.params;
    const pricing = await PricingSettings.findOneAndDelete({ cityId });

    if (!pricing) {
      return res.status(404).json({ message: 'Pricing settings not found' });
    }

    res.json({ message: 'Pricing settings deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting pricing settings', error: error.message });
  }
};

// Bulk update pricing settings for multiple cities
export const bulkUpdatePricingSettings = async (req, res) => {
  try {
    const { settings } = req.body; // Array of pricing settings

    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({ message: 'Invalid settings array' });
    }

    const updatePromises = settings.map(setting => {
      return PricingSettings.findOneAndUpdate(
        { cityId: setting.cityId },
        setting,
        { upsert: true, new: true, runValidators: true }
      );
    });

    const results = await Promise.all(updatePromises);

    res.json({ 
      pricing: results, 
      message: 'Pricing settings updated successfully' 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error bulk updating pricing settings', error: error.message });
  }
};
